import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function responseDouble() {
  return {
    statusCode: null,
    headers: null,
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.body = body;
    },
  };
}

test('expone el estado de la API', async () => {
  const response = responseDouble();
  await createApp()({ method: 'GET', url: '/health' }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
});

test('expone el catalogo de productos', async () => {
  const response = responseDouble();
  await createApp()({ method: 'GET', url: '/api/products' }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).data.length, 2);
});
