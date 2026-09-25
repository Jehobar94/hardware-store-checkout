import { sendJson } from './shared/http-response.js';
import { ProductController } from './modules/products/product-controller.js';
import { ProductRepository } from './modules/products/product-repository.js';
import { ProductService } from './modules/products/product-service.js';
import { createSupabaseClient } from './config/supabase-client.js';
import { wompiEnv } from './config/env.js';
import { WompiClient } from './modules/payments/wompi-client.js';
import { PaymentService } from './modules/payments/payment-service.js';
import { readJson } from './shared/request-body.js';

export function createApp({ productController = buildProductController() } = {}) {
  return async function app(request, response) {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'POST' && request.url === '/api/payments') {
        const paymentService = buildPaymentService();
        const result = await paymentService.createPayment(await readJson(request));
        sendJson(response, 201, result);
        return;
      }

      if (request.method === 'GET' && request.url === '/api/products') {
        await productController.list(request, response);
        return;
      }

      const productMatch = request.url.match(/^\/api\/products\/([^/]+)$/);
      if (request.method === 'GET' && productMatch) {
        await productController.getById(productMatch[1], response);
        return;
      }

      sendJson(response, 404, { message: 'Route not found' });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      sendJson(response, statusCode, {
        message: statusCode === 500 ? 'Internal server error' : error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
  };
}

function buildPaymentService() {
  const supabase = createSupabaseClient();
  if (!supabase || !wompiEnv.publicKey) {
    throw new Error('Payment integration is not configured');
  }
  return new PaymentService({
    supabase,
    wompiClient: new WompiClient(wompiEnv),
  });
}

function buildProductController() {
  const repository = new ProductRepository(undefined, createSupabaseClient());
  const service = new ProductService(repository);
  return new ProductController(service);
}
