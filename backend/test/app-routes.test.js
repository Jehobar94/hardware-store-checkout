import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function responseDouble() {
  return { statusCode: null, body: '', writeHead(statusCode) { this.statusCode = statusCode; }, end(body = '') { this.body = body; } };
}

function requestBody(body) {
  return { async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)); } };
}

test('expone la configuración pública de tokenización', async () => {
  const response = responseDouble();
  await createApp()({ method: 'GET', url: '/api/payments/tokenization-config' }, response);
  assert.equal(response.statusCode, 200);
  assert.ok(JSON.parse(response.body).data.apiUrl);
});

test('devuelve 404 en una ruta desconocida', async () => {
  const response = responseDouble();
  await createApp()({ method: 'GET', url: '/api/unknown' }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(JSON.parse(response.body).message, 'Route not found');
});

test('expone productos por lista y por id usando el controlador inyectado', async () => {
  const productController = {
    list: async (_request, response) => { response.writeHead(200); response.end(JSON.stringify({ data: [{ id: 'p1' }] })); },
    getById: async (id, response) => { response.writeHead(200); response.end(JSON.stringify({ data: { id } })); },
  };
  const app = createApp({ productController });
  const listResponse = responseDouble();
  const detailResponse = responseDouble();
  await app({ method: 'GET', url: '/api/products' }, listResponse);
  await app({ method: 'GET', url: '/api/products/p1' }, detailResponse);
  assert.deepEqual(JSON.parse(listResponse.body).data, [{ id: 'p1' }]);
  assert.deepEqual(JSON.parse(detailResponse.body).data, { id: 'p1' });
});

test('expone órdenes, sincronización y webhook con el servicio inyectado', async () => {
  const paymentService = {
    createOrder: async (input) => ({ orderId: 'order-1', items: input.items }),
    syncOrder: async (id) => ({ transactionId: id, status: 'approved' }),
    handleWebhook: async () => ({ received: true, matched: true, status: 'approved' }),
  };
  const app = createApp({ paymentService });
  const orderResponse = responseDouble();
  await app({ method: 'POST', url: '/api/orders', ...requestBody({ items: [{ productId: 'p1', quantity: 1 }] }) }, orderResponse);
  assert.equal(orderResponse.statusCode, 201);
  const syncResponse = responseDouble();
  await app({ method: 'GET', url: '/api/orders/order-1' }, syncResponse);
  assert.equal(syncResponse.statusCode, 200);
  const webhookResponse = responseDouble();
  await app({ method: 'POST', url: '/api/webhooks/wompi', ...requestBody({ event: 'transaction.updated' }) }, webhookResponse);
  assert.equal(webhookResponse.statusCode, 200);
});
