import { sendJson } from '../../shared/http-response.js';

export class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  async list(_request, response) {
    const products = await this.productService.listProducts();
    sendJson(response, 200, { data: products });
  }

  async getById(id, response) {
    const product = await this.productService.getProduct(id);
    sendJson(response, 200, { data: product });
  }
}
