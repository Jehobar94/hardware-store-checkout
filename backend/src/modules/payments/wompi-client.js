import { HttpError } from '../../shared/http-error.js';

export class WompiClient {
  constructor({ apiUrl, publicKey, privateKey, fetcher = fetch }) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.fetcher = fetcher;
  }

  async getMerchantInfo() {
    return this.#request('/merchants/info', {
      headers: { 'x-merchant-public-key': this.publicKey },
    });
  }

  async createTransaction(payload) {
    return this.#request('/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.publicKey}` },
      body: JSON.stringify(payload),
    });
  }

  async getTransaction(id) {
    return this.#request(`/transactions/${encodeURIComponent(id)}`);
  }

  async #request(path, options = {}) {
    const response = await this.fetcher(`${this.apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const payload = await response.json();
    if (!response.ok) throw new HttpError(502, 'Wompi request failed', payload);
    return payload;
  }
}
