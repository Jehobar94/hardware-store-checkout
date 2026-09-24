import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';

const server = http.createServer(createApp({
  productController: { list: async (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ data: [] }));
  } },
}));

server.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});
