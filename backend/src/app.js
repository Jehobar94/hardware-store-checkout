import { sendJson } from './shared/http-response.js';

export function createApp({ productController }) {
  return async function app(request, response) {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'GET' && request.url === '/api/products') {
        await productController.list(request, response);
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
