import http from 'node:http';

const port = Number(process.env.PORT || 3000);

const server = http.createServer((request, response) => {
  if (request.url === '/health' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ message: 'Route not found' }));
});

server.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
