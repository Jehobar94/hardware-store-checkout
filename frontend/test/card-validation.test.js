import test from 'node:test';
import assert from 'node:assert/strict';
import { getCardBrand, isValidCardNumber } from '../src/features/payment/card-validation.js';

test('detecta Visa y valida el número', () => {
  assert.equal(getCardBrand('4242 4242 4242 4242'), 'visa');
  assert.equal(isValidCardNumber('4242 4242 4242 4242'), true);
});

test('detecta Mastercard en sus rangos válidos', () => {
  assert.equal(getCardBrand('5555 5555 5555 4444'), 'mastercard');
  assert.equal(getCardBrand('2221 0000 0000 0009'), 'mastercard');
});

test('rechaza un número incompleto', () => {
  assert.equal(isValidCardNumber('4242 4242'), false);
});
