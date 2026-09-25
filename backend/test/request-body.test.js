import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../src/shared/request-body.js';

const request = (value) => Readable.from([Buffer.from(value)]);
import { Readable } from 'node:stream';

test('lee un body JSON válido', async () => assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true }));
test('devuelve objeto vacío para body vacío', async () => assert.deepEqual(await readJson(request('')), {}));
test('rechaza JSON inválido', async () => assert.rejects(() => readJson(request('{')), { statusCode: 400, message: 'Request body must be valid JSON' }));
