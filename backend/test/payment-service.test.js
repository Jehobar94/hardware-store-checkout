import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PaymentService, BASE_FEE_IN_CENTS } from '../src/modules/payments/payment-service.js';

const product = { id: 'product-1', price_in_cents: 8990000, currency: 'COP', stock: 10 };
const mouse = { id: 'product-2', name: 'Mouse', price_in_cents: 5000000, currency: 'COP', stock: 8 };

function supabaseDouble({ transactionStatus = 'pending', rpcError = null } = {}) {
  const transactions = [];
  const updates = [];
  const client = {
    from(table) {
      const query = {
        insert(values) { query.inserted = values; return query; },
        select() { return query; },
        eq() { return query; },
        maybeSingle: async () => table === 'products' ? { data: product, error: null } : { data: null, error: null },
        single: async () => table === 'transactions' ? { data: { id: 'local-1', product_id: product.id, quantity: 1, status: transactionStatus, wompi_transaction_id: 'wompi-1' }, error: null } : { data: { id: `${table}-1`, ...query.inserted }, error: null },
        update(values) { updates.push({ table, values }); return query; },
      };
      return query;
    },
    rpc: async () => ({ error: rpcError }),
    transactions,
    updates,
  };
  return client;
}

function validInput(overrides = {}) {
  return { productId: product.id, quantity: 1, customer: { fullName: 'Test User', email: 'test@example.com', phone: '3000000000' }, delivery: { address: 'Street 1', city: 'Medellín' }, acceptanceToken: 'acceptance', acceptPersonalAuth: 'personal', paymentMethod: { type: 'CARD', token: 'tok_test' }, ...overrides };
}

function orderSupabaseDouble({ status = 'pending', rpcError = null } = {}) {
  const updates = [];
  const rpcCalls = [];
  const products = [product, mouse];
  const client = {
    from(table) {
      const query = { inserted: null };
      query.insert = (values) => { query.inserted = values; return query; };
      query.select = () => query;
      query.eq = (field, value) => { query.filters = { ...(query.filters || {}), [field]: value }; return query; };
      query.maybeSingle = async () => {
        if (table === 'products') return { data: products.find((item) => item.id === query.filters?.id) || null, error: null };
        if (table === 'orders') return { data: query.filters?.wompi_transaction_id === 'unknown' ? null : { id: 'order-1', status, wompi_transaction_id: 'wompi-order-1' }, error: null };
        return { data: null, error: null };
      };
      query.single = async () => ({ data: table === 'orders' ? { id: 'order-1', ...query.inserted } : { id: `${table}-1`, ...query.inserted }, error: null });
      query.update = (values) => { updates.push({ table, values }); return query; };
      return query;
    },
    rpc: async (name, args) => { rpcCalls.push({ name, args }); return { error: rpcError }; },
    updates,
    rpcCalls,
  };
  return client;
}

test('crea una transacción con base fee incluida', async () => {
  const supabase = supabaseDouble();
  const wompiClient = { createTransaction: async () => ({ data: { id: 'wompi-1', status: 'CREATED' } }) };
  const service = new PaymentService({ supabase, wompiClient, integritySecret: 'secret' });
  const result = await service.createPayment(validInput());

  assert.equal(result.wompi.id, 'wompi-1');
  assert.equal(supabase.updates.at(-1).values.status, 'created');
  assert.equal(BASE_FEE_IN_CENTS, 2000000);
});

test('rechaza una compra que supera el stock', async () => {
  const supabase = supabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {} });
  await assert.rejects(() => service.createPayment(validInput({ quantity: 11 })), { statusCode: 409, message: 'Insufficient stock' });
});

test('sincroniza pago aprobado y descuenta stock mediante RPC', async () => {
  const supabase = supabaseDouble();
  let requestedId;
  const wompiClient = { getTransaction: async (id) => { requestedId = id; return { data: { id, status: 'APPROVED' } }; } };
  const service = new PaymentService({ supabase, wompiClient });
  const result = await service.syncPayment('local-1');

  assert.equal(requestedId, 'wompi-1');
  assert.equal(result.status, 'approved');
  assert.equal(result.wompi.status, 'APPROVED');
});

test('no llama Wompi si la transacción ya está aprobada', async () => {
  const supabase = supabaseDouble({ transactionStatus: 'approved' });
  const wompiClient = { getTransaction: async () => assert.fail('No debería consultar Wompi') };
  const service = new PaymentService({ supabase, wompiClient });
  assert.deepEqual(await service.syncPayment('local-1'), { transactionId: 'local-1', status: 'approved' });
});

test('crea una orden con varios productos y una sola tarifa base', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: { createTransaction: async () => ({ data: { id: 'wompi-order-1', status: 'PENDING' } }) }, integritySecret: 'secret' });
  const result = await service.createOrder({ items: [{ productId: product.id, quantity: 1 }, { productId: mouse.id, quantity: 2 }], customer: { fullName: 'Test', email: 'test@example.com' }, delivery: { address: 'Street', city: 'Medellín' }, acceptanceToken: 'a', acceptPersonalAuth: 'p', paymentMethod: { type: 'CARD', token: 'tok' } });
  assert.equal(result.orderId, 'order-1');
  const orderInsert = supabase.updates.length;
  assert.equal(BASE_FEE_IN_CENTS, 2000000);
  assert.equal(orderInsert, 1);
});

test('rechaza una orden cuando uno de los productos no tiene stock', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {} });
  await assert.rejects(() => service.createOrder({ items: [{ productId: product.id, quantity: 1 }, { productId: mouse.id, quantity: 99 }], customer: { email: 'test@example.com' }, delivery: { address: 'Street', city: 'Medellín' } }), { statusCode: 409 });
});

test('webhook aprobado descuenta el stock de la orden una sola vez', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {}, eventSecret: '' });
  const payload = { event: 'transaction.updated', data: { transaction: { id: 'wompi-order-1', status: 'APPROVED' } } };
  assert.deepEqual(await service.handleWebhook(payload), { received: true, matched: true, status: 'approved' });
  assert.deepEqual(supabase.rpcCalls[0], { name: 'decrement_order_stock', args: { p_order_id: 'order-1' } });
});

test('webhook rechazado actualiza estado y no descuenta stock', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {}, eventSecret: '' });
  const result = await service.handleWebhook({ event: 'transaction.updated', data: { transaction: { id: 'wompi-order-1', status: 'DECLINED' } } });
  assert.equal(result.status, 'declined');
  assert.equal(supabase.rpcCalls.length, 0);
  assert.equal(supabase.updates.at(-1).values.status, 'declined');
});

test('webhook valida firma y rechaza checksum inválido', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {}, eventSecret: 'event-secret' });
  const payload = { event: 'transaction.updated', data: { transaction: { id: 'wompi-order-1', status: 'APPROVED', amount_in_cents: 100 } }, timestamp: 123, signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: 'invalid' } };
  await assert.rejects(() => service.handleWebhook(payload), { statusCode: 401 });
});

test('webhook acepta una firma válida y eventos no asociados', async () => {
  const supabase = orderSupabaseDouble();
  const service = new PaymentService({ supabase, wompiClient: {}, eventSecret: 'event-secret' });
  const transaction = { id: 'wompi-order-1', status: 'APPROVED', amount_in_cents: 100 };
  const payload = { event: 'transaction.updated', data: { transaction }, timestamp: 123, signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] } };
  const values = payload.signature.properties.map((property) => property.split('.').reduce((value, key) => value?.[key], payload.data));
  const source = `${values.join('')}${payload.timestamp}event-secret`;
  payload.signature.checksum = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal((await service.handleWebhook(payload)).matched, true);
  const unmatchedService = new PaymentService({ supabase, wompiClient: {}, eventSecret: '' });
  const unmatched = await unmatchedService.handleWebhook({ event: 'transaction.updated', data: { transaction: { id: 'unknown', status: 'APPROVED' } } });
  assert.equal(unmatched.matched, false);
});

test('webhook rechaza eventos incompletos', async () => {
  const service = new PaymentService({ supabase: orderSupabaseDouble(), wompiClient: {} });
  await assert.rejects(() => service.handleWebhook({ event: 'other' }), { statusCode: 400 });
});

test('evento duplicado no vuelve a descontar stock', async () => {
  const supabase = orderSupabaseDouble({ status: 'approved' });
  const service = new PaymentService({ supabase, wompiClient: {}, eventSecret: '' });
  const result = await service.handleWebhook({ event: 'transaction.updated', data: { transaction: { id: 'wompi-order-1', status: 'APPROVED' } } });
  assert.equal(result.status, 'approved');
  assert.equal(supabase.rpcCalls.length, 0);
});
