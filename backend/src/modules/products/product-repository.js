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
  #client;

  constructor(products = seedProducts, client = null) {
    this.#products = structuredClone(products);
    this.#client = client;
  }

  async findAll() {
    if (this.#client) {
      const { data, error } = await this.#client.from('products').select('*').eq('is_active', true).order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(mapProduct);
    }
    return structuredClone(this.#products);
  }

  async findById(id) {
    if (this.#client) {
      const { data, error } = await this.#client.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data ? mapProduct(data) : null;
    }
    const product = this.#products.find((item) => item.id === id);
    return product ? structuredClone(product) : null;
  }
}

function mapProduct(product) {
  return {
    ...product,
    priceInCents: Number(product.priceInCents ?? product.price_in_cents),
    originalPriceInCents: product.originalPriceInCents ?? (product.original_price_in_cents == null ? undefined : Number(product.original_price_in_cents)),
    imageUrls: product.imageUrls ?? product.image_urls ?? [],
  };
}
