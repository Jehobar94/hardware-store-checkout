const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

export const env = { host, port };

export const wompiEnv = {
  apiUrl: process.env.WOMPI_API_URL || 'https://api-sandbox.co.uat.wompi.dev/v1',
  publicKey: process.env.WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
};
