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
      headers: { Authorization: `Bearer ${this.privateKey}` },
      body: JSON.stringify(payload),
    });
  }

  async tokenizeEncryptedCard(payload) {
    return this.#request('/tokens/cards', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.publicKey}` },
      body: JSON.stringify({ payload }),
    });
  }

  async getTokenizationKey() {
    return this.#request('/tokens/keys/tokenization', {
      headers: { Authorization: `Bearer ${this.publicKey}` },
    });
  }

  async getTransaction(id) {
    return this.#request(`/transactions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${this.privateKey}` },
    });
  }

  async #request(path, options = {}) {
    const response = await this.fetcher(`${this.apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const rawBody = await response.text();
    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = { raw: rawBody.slice(0, 500) };
    }
    if (!response.ok) {
      throw new HttpError(502, `Wompi request failed (${response.status})`, payload);
    }
    return payload;
  }
}
