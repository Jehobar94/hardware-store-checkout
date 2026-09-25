import crypto from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';

export class PaymentService {
  constructor({ supabase, wompiClient }) {
    this.supabase = supabase;
    this.wompiClient = wompiClient;
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
    const total = product.price_in_cents * input.quantity + (input.deliveryFee || 0);
    const transaction = await this.#insert('transactions', {
      product_id: product.id,
      customer_id: customer.id,
      delivery_id: delivery.id,
      quantity: input.quantity,
      product_amount: product.price_in_cents * input.quantity,
      delivery_fee: input.deliveryFee || 0,
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
        signature: input.signature,
        payment_method: input.paymentMethod,
      });
      await this.#update('transactions', transaction.id, { wompi_transaction_id: wompi.data.id, status: String(wompi.data.status || 'PENDING').toLowerCase() });
      return { transactionId: transaction.id, wompi: wompi.data };
    } catch (error) {
      await this.#update('transactions', transaction.id, { status: 'error' });
      throw error;
    }
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
  }
}
