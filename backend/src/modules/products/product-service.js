import { HttpError } from '../../shared/http-error.js';

export class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async listProducts() {
    return this.productRepository.findAll();
  }

  async getProduct(id) {
    if (!id) {
      throw new HttpError(400, 'Product id is required');
    }

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpError(404, 'Product not found');
    }

    return product;
  }
}
