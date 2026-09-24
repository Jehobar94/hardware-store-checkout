import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';

const server = http.createServer(createApp());

server.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});
