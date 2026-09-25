import { useEffect, useState } from 'react';
import { demoProducts } from './data/demo-products.js';

const moneyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-image" aria-hidden="true"><span>{product.id === 'ceramic-mug' ? '☕' : '✦'}</span></div>
      <div className="product-card__content">
        <div className="product-card__heading"><h2>{product.name}</h2><span className="stock-badge">{product.stock} available</span></div>
        <p>{product.description}</p>
        <div className="product-card__footer"><strong>{moneyFormatter.format(product.priceInCents / 100)}</strong><button type="button">View product</button></div>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/api/products')
      .then((response) => { if (!response.ok) throw new Error('Could not load products'); return response.json(); })
      .then((payload) => { setProducts(payload.data); setStatus('ready'); })
      .catch(() => { setProducts(demoProducts); setStatus('demo'); });
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="/">northstar<span>store</span></a><button className="cart-button" type="button" aria-label="Shopping cart">Cart <span>0</span></button></header>
      <main>
        <section className="hero"><p className="eyebrow">Small things, well made</p><h1>Find something worth<br /><em>keeping.</em></h1><p className="hero__copy">A small selection of everyday objects, ready to make your routine a little better.</p></section>
        <section className="catalog" aria-labelledby="catalog-title"><div className="section-heading"><h2 id="catalog-title">The collection</h2>{status === 'demo' && <span className="status-note">Showing local preview</span>}</div>{status === 'loading' && <p className="empty-state">Loading products...</p>}{products.length > 0 && <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</section>
      </main>
      <footer className="site-footer">Built for slow mornings and good ideas.</footer>
    </div>
  );
}
