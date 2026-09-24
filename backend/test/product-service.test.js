import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductRepository } from '../src/modules/products/product-repository.js';
import { ProductService } from '../src/modules/products/product-service.js';

test('lista productos sembrados con stock', async () => {
  const service = new ProductService(new ProductRepository());
  const products = await service.listProducts();

  assert.equal(products.length, 2);
  assert.ok(products.every((product) => product.stock > 0));
});

test('devuelve error cuando el producto no existe', async () => {
  const service = new ProductService(new ProductRepository());

  await assert.rejects(
    () => service.getProduct('missing-product'),
    { statusCode: 404, message: 'Product not found' },
  );
});
