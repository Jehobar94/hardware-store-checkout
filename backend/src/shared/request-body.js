export async function readJson(request, maxBytes = 1_000_000) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) chunks.push(chunk);
  for (const chunk of chunks) totalBytes += Buffer.byteLength(chunk);
  if (totalBytes > maxBytes) {
    const error = new Error('Request body is too large');
    error.statusCode = 413;
    throw error;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Request body must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
}
