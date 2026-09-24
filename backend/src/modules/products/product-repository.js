const seedProducts = [
  {
    id: 'coffee-subscription',
    name: 'Coffee Subscription',
    description: 'Fresh coffee delivered every month.',
    priceInCents: 4500000,
    currency: 'COP',
    stock: 8,
  },
  {
    id: 'ceramic-mug',
    name: 'Ceramic Mug',
    description: 'A simple mug for the daily coffee ritual.',
    priceInCents: 2800000,
    currency: 'COP',
    stock: 15,
  },
];

export class ProductRepository {
  #products;

  constructor(products = seedProducts) {
    this.#products = structuredClone(products);
  }

  async findAll() {
    return structuredClone(this.#products);
  }

  async findById(id) {
    const product = this.#products.find((item) => item.id === id);
    return product ? structuredClone(product) : null;
  }
}
