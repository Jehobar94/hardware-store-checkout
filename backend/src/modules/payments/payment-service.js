import crypto from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';

export const BASE_FEE_IN_CENTS = 2000000;
export const DELIVERY_FEE_IN_CENTS = 2000000;
export const FREE_SHIPPING_THRESHOLD_IN_CENTS = 15000000;

export class PaymentService {
  constructor({ supabase, wompiClient, integritySecret = '', eventSecret = '' }) {
    this.supabase = supabase;
    this.wompiClient = wompiClient;
    this.integritySecret = integritySecret;
    this.eventSecret = eventSecret;
  }

  async getAcceptanceData() {
    const merchant = await this.wompiClient.getMerchantInfo();
    return merchant.data;
  }

  async createPayment(input) {
    this.#validate(input);
    const product = await this.#getProduct(input.productId);
    if (product.stock < input.quantity) throw new HttpError(409, 'Insufficient stock');

    const customer = await this.#insert('customers', {
      full_name: input.customer.fullName,
      email: input.customer.email,
      phone: input.customer.phone,
    });
    const delivery = await this.#insert('deliveries', {
      customer_id: customer.id,
      address_line: input.delivery.address,
      city: input.delivery.city,
      department: input.delivery.department,
    });
    const reference = input.reference || `STORE-${crypto.randomUUID()}`;
    const productAmount = product.price_in_cents * input.quantity;
    const deliveryFee = product.free_shipping || productAmount >= FREE_SHIPPING_THRESHOLD_IN_CENTS ? 0 : DELIVERY_FEE_IN_CENTS;
    const total = productAmount + BASE_FEE_IN_CENTS + deliveryFee;
    const signature = crypto.createHash('sha256').update(`${reference}${total}${product.currency}${this.integritySecret}`).digest('hex');
    const transaction = await this.#insert('transactions', {
      product_id: product.id,
      customer_id: customer.id,
      delivery_id: delivery.id,
      quantity: input.quantity,
      product_amount: productAmount,
      base_fee: BASE_FEE_IN_CENTS,
      delivery_fee: deliveryFee,
      total_amount: total,
      currency: product.currency,
      status: 'pending',
    });

    try {
      const wompi = await this.wompiClient.createTransaction({
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.acceptPersonalAuth,
        amount_in_cents: total,
        currency: product.currency,
        customer_email: input.customer.email,
        reference,
        signature,
        payment_method: input.paymentMethod,
      });
      await this.#update('transactions', transaction.id, { wompi_transaction_id: wompi.data.id, status: String(wompi.data.status || 'PENDING').toLowerCase() });
      return { transactionId: transaction.id, wompi: wompi.data };
    } catch (error) {
      await this.#update('transactions', transaction.id, { status: 'error' });
      throw error;
    }
  }

  async createOrder(input) {
    if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, 'Order items are required');
    if (input.items.length > 50) throw new HttpError(400, 'Too many order items');
    const products = [];
    for (const item of input.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) throw new HttpError(400, 'Order item is invalid');
      const product = await this.#getProduct(item.productId);
      if (product.stock < item.quantity) throw new HttpError(409, `Insufficient stock for ${product.name}`);
      products.push({ product, quantity: item.quantity });
    }
    this.#validateCustomerAndDelivery(input);
    const customer = await this.#insert('customers', { full_name: input.customer.fullName, email: input.customer.email, phone: input.customer.phone });
    const delivery = await this.#insert('deliveries', { customer_id: customer.id, address_line: input.delivery.address, city: input.delivery.city, department: input.delivery.department });
    const productAmount = products.reduce((sum, item) => sum + item.product.price_in_cents * item.quantity, 0);
    const deliveryFee = this.#calculateDeliveryFee(products);
    const total = productAmount + BASE_FEE_IN_CENTS + deliveryFee;
    const order = await this.#insert('orders', { customer_id: customer.id, delivery_id: delivery.id, product_amount: productAmount, base_fee: BASE_FEE_IN_CENTS, delivery_fee: deliveryFee, total_amount: total, currency: products[0].product.currency, status: 'pending' });
    for (const item of products) await this.#insert('order_items', { order_id: order.id, product_id: item.product.id, quantity: item.quantity, unit_price_in_cents: item.product.price_in_cents });
    const reference = input.reference || `STORE-${crypto.randomUUID()}`;
    const signature = crypto.createHash('sha256').update(`${reference}${total}${products[0].product.currency}${this.integritySecret}`).digest('hex');
    try {
      const wompi = await this.wompiClient.createTransaction({ acceptance_token: input.acceptanceToken, accept_personal_auth: input.acceptPersonalAuth, amount_in_cents: total, currency: products[0].product.currency, customer_email: input.customer.email, reference, signature, payment_method: input.paymentMethod });
      await this.#update('orders', order.id, { wompi_transaction_id: wompi.data.id, status: String(wompi.data.status || 'PENDING').toLowerCase() });
      return { orderId: order.id, transactionId: order.id, wompi: wompi.data };
    } catch (error) { await this.#update('orders', order.id, { status: 'error' }); throw error; }
  }

  async syncPayment(transactionId) {
    const { data: local, error } = await this.supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (error) throw error;
    if (!local.wompi_transaction_id) throw new HttpError(409, 'Wompi transaction is not available yet');
    if (local.status === 'approved') return { transactionId, status: 'approved' };
    const result = await this.wompiClient.getTransaction(local.wompi_transaction_id);
    const status = String(result.data.status || '').toLowerCase();
    await this.#update('transactions', transactionId, { status });
    if (status === 'approved') {
      const { error: stockError } = await this.supabase.rpc('decrement_product_stock', { p_product_id: local.product_id, p_quantity_to_decrement: local.quantity });
      if (stockError && !stockError.message.includes('already processed')) throw stockError;
    }
    return { transactionId, status, wompi: result.data };
  }

  async syncOrder(orderId) {
    const { data: order, error } = await this.supabase.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    if (!order.wompi_transaction_id) throw new HttpError(409, 'Wompi transaction is not available yet');
    if (order.status === 'approved') return { transactionId: orderId, status: 'approved' };
    const result = await this.wompiClient.getTransaction(order.wompi_transaction_id);
    const status = String(result.data.status || '').toLowerCase();
    await this.#update('orders', orderId, { status });
    if (status === 'approved') {
      const { error: stockError } = await this.supabase.rpc('decrement_order_stock', { p_order_id: orderId });
      if (stockError && !stockError.message.includes('already processed')) throw stockError;
    }
    return { transactionId: orderId, status, wompi: result.data };
  }

  async handleWebhook(payload) {
    const event = payload?.event;
    const transaction = payload?.data?.transaction;
    if (event !== 'transaction.updated' || !transaction?.id || !transaction?.status) {
      throw new HttpError(400, 'Unsupported or incomplete Wompi event');
    }
    if (!this.eventSecret) throw new HttpError(503, 'Webhook signing secret is not configured');
    {
      const properties = payload.signature?.properties || [];
      const values = properties.map((property) => property.split('.').reduce((value, key) => value?.[key], { ...payload.data, transaction: payload.data.transaction }));
      const source = `${values.join('')}${payload.timestamp}${this.eventSecret}`;
      const expected = crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
      const received = String(payload.signature?.checksum || '').toUpperCase();
      if (!received || expected.length !== received.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) throw new HttpError(401, 'Invalid Wompi event signature');
    }
    const { data: order } = await this.supabase.from('orders').select('*').eq('wompi_transaction_id', transaction.id).maybeSingle();
    if (!order) return { received: true, matched: false };
    const status = String(transaction.status).toLowerCase();
    if (order.status === 'approved') return { received: true, matched: true, status: 'approved' };
    await this.#update('orders', order.id, { status });
    if (status === 'approved') {
      const { error: stockError } = await this.supabase.rpc('decrement_order_stock', { p_order_id: order.id });
      if (stockError && !stockError.message.includes('already processed')) throw stockError;
    }
    return { received: true, matched: true, status };
  }

  async #getProduct(id) {
    const { data, error } = await this.supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, 'Product not found');
    return data;
  }

  async #insert(table, values) {
    const { data, error } = await this.supabase.from(table).insert(values).select().single();
    if (error) throw error;
    return data;
  }

  async #update(table, id, values) {
    const { error } = await this.supabase.from(table).update(values).eq('id', id);
    if (error) throw error;
  }

  #validate(input) {
    if (!input.productId || !Number.isInteger(input.quantity) || input.quantity < 1 || !input.customer?.email || !input.delivery?.address || !input.delivery?.city || !input.paymentMethod || !input.acceptanceToken || !input.acceptPersonalAuth) {
      throw new HttpError(400, 'Payment data is incomplete');
    }
    this.#validateCustomerAndDelivery(input);
  }

  #validateCustomerAndDelivery(input) {
    const email = input.customer?.email;
    const fullName = input.customer?.fullName;
    const phone = input.customer?.phone;
    const address = input.delivery?.address;
    const city = input.delivery?.city;
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Customer email is invalid');
    if (![fullName, address, city].every((value) => typeof value === 'string' && value.trim().length >= 2 && value.length <= 160)) throw new HttpError(400, 'Customer or delivery data is invalid');
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length < 7 || phone.length > 30)) throw new HttpError(400, 'Customer phone is invalid');
  }

  #calculateDeliveryFee(products) {
    const productAmount = products.reduce((sum, item) => sum + item.product.price_in_cents * item.quantity, 0);
    const allFreeShipping = products.length > 0 && products.every((item) => item.product.free_shipping);
    return productAmount >= FREE_SHIPPING_THRESHOLD_IN_CENTS || allFreeShipping ? 0 : DELIVERY_FEE_IN_CENTS;
  }
}
