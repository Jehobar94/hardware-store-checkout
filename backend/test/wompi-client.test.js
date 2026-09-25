import test from 'node:test';
import assert from 'node:assert/strict';
import { WompiClient } from '../src/modules/payments/wompi-client.js';

const response = (body, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) });

test('envía tokenización con llave pública', async () => {
  let request;
  const client = new WompiClient({ apiUrl: 'https://sandbox.test/v1/', publicKey: 'pub_test', fetcher: async (...args) => { request = args; return response({ data: { id: 'tok-1' } }); } });
  const result = await client.tokenizeEncryptedCard('encrypted');
  assert.equal(result.data.id, 'tok-1');
  assert.equal(request[0], 'https://sandbox.test/v1/tokens/cards');
  assert.equal(request[1].headers.Authorization, 'Bearer pub_test');
});

test('construye las operaciones principales de Wompi', async () => {
  const calls = [];
  const client = new WompiClient({ apiUrl: 'https://sandbox.test/v1', publicKey: 'pub_test', privateKey: 'prv_test', fetcher: async (...args) => { calls.push(args); return response({ data: { id: 'ok' } }); } });
  await client.getMerchantInfo();
  await client.createTransaction({ amount_in_cents: 1 });
  await client.getTokenizationKey();
  await client.getTransaction('tx-1');
  assert.equal(calls.length, 4);
  assert.equal(calls[0][0], 'https://sandbox.test/v1/merchants/info');
  assert.equal(calls[1][0], 'https://sandbox.test/v1/transactions');
  assert.equal(calls[2][0], 'https://sandbox.test/v1/tokens/keys/tokenization');
  assert.equal(calls[3][0], 'https://sandbox.test/v1/transactions/tx-1');
  assert.equal(calls[3][1].headers.Authorization, 'Bearer prv_test');
});

test('convierte una respuesta HTTP de Wompi en HttpError', async () => {
  const client = new WompiClient({ apiUrl: 'https://sandbox.test/v1', publicKey: 'pub_test', privateKey: 'prv_test', fetcher: async () => response({ error: { reason: 'invalid' } }, false, 422) });
  await assert.rejects(() => client.getTransaction('tx-1'), { statusCode: 502, message: 'Wompi request failed (422)' });
});
