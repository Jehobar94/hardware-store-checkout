import { sendJson } from './shared/http-response.js';
import { ProductController } from './modules/products/product-controller.js';
import { ProductRepository } from './modules/products/product-repository.js';
import { ProductService } from './modules/products/product-service.js';
import { createSupabaseClient } from './config/supabase-client.js';
import { wompiEnv } from './config/env.js';
import { WompiClient } from './modules/payments/wompi-client.js';
import { PaymentService } from './modules/payments/payment-service.js';
import { readJson } from './shared/request-body.js';

export function createApp({ productController = buildProductController(), paymentService = null } = {}) {
  const requestCounts = new Map();
  const rateLimit = (request, response) => {
    const now = Date.now();
    const key = `${request.socket?.remoteAddress || 'unknown'}:${request.url.split('?')[0]}`;
    const current = requestCounts.get(key);
    if (!current || now - current.startedAt >= 60_000) {
      requestCounts.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    if (current.count > 30) {
      sendJson(response, 429, { message: 'Too many requests' });
      return false;
    }
    return true;
  };
  const getPaymentService = () => paymentService || buildPaymentService();
  return async function app(request, response) {
    const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173';
    if (typeof response.setHeader === 'function') {
      response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; form-action 'none'");
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    try {
      if (!rateLimit(request, response)) return;
      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'POST' && request.url === '/api/payments') {
        const result = await getPaymentService().createPayment(await readJson(request));
        sendJson(response, 201, result);
        return;
      }
      if (request.method === 'POST' && request.url === '/api/orders') {
        const result = await getPaymentService().createOrder(await readJson(request));
        sendJson(response, 201, result);
        return;
      }
      if (request.method === 'POST' && request.url === '/api/webhooks/wompi') {
        const result = await getPaymentService().handleWebhook(await readJson(request));
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'POST' && request.url === '/api/payments/tokenize') {
        const payload = await readJson(request);
        if (!payload?.payload) {
          sendJson(response, 400, { message: 'Encrypted card payload is required' });
          return;
        }
        const result = await new WompiClient(wompiEnv).tokenizeEncryptedCard(payload.payload);
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'GET' && request.url === '/api/payments/tokenization-key') {
        const result = await new WompiClient(wompiEnv).getTokenizationKey();
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'GET' && request.url === '/api/payments/acceptance') {
        const merchant = await getPaymentService().getAcceptanceData();
        sendJson(response, 200, { data: merchant });
        return;
      }

      if (request.method === 'GET' && request.url === '/api/payments/tokenization-config') {
        sendJson(response, 200, { data: { apiUrl: wompiEnv.apiUrl, publicKey: wompiEnv.publicKey } });
        return;
      }

      const paymentMatch = request.url.match(/^\/api\/payments\/([^/]+)$/);
      if (request.method === 'GET' && paymentMatch) {
        const result = await getPaymentService().syncPayment(paymentMatch[1]);
        sendJson(response, 200, result);
        return;
      }
      const orderMatch = request.url.match(/^\/api\/orders\/([^/]+)$/);
      if (request.method === 'GET' && orderMatch) {
        const result = await getPaymentService().syncOrder(orderMatch[1]);
        sendJson(response, 200, result);
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
      console.error('Request failed', request.method, request.url, error);
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
    integritySecret: wompiEnv.integritySecret,
    eventSecret: wompiEnv.eventSecret,
  });
}

function buildProductController() {
  const repository = new ProductRepository(undefined, createSupabaseClient());
  const service = new ProductService(repository);
  return new ProductController(service);
}
