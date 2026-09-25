import { useEffect, useState } from 'react';
import { demoProducts } from './data/demo-products.js';

const moneyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const copy = {
  en: {
    language: 'Español',
    cart: 'Cart',
    eyebrow: 'Small things, well made',
    title: <>Find something worth<br /><em>keeping.</em></>,
    intro: 'A small selection of everyday objects, ready to make your routine a little better.',
    collection: 'The collection',
    localPreview: 'Showing local preview',
    loading: 'Loading products...',
    available: 'available',
    viewProduct: 'View product',
    footer: 'Built for slow mornings and good ideas.',
  },
  es: {
    language: 'English',
    cart: 'Carrito',
    eyebrow: 'Pequeñas cosas, bien hechas',
    title: <>Encuentra algo que<br /><em>quieras conservar.</em></>,
    intro: 'Una selección de objetos cotidianos para hacer un poco mejor tu rutina.',
    collection: 'La colección',
    localPreview: 'Mostrando vista local',
    loading: 'Cargando productos...',
    available: 'disponibles',
    viewProduct: 'Ver producto',
    footer: 'Hecho para mañanas lentas y buenas ideas.',
  },
};

const translatedProducts = {
  'coffee-subscription': { name: 'Suscripción de café', description: 'Café fresco entregado cada mes.' },
  'ceramic-mug': { name: 'Taza de cerámica', description: 'Una taza sencilla para el ritual diario del café.' },
};

function ProductCard({ product, text, language }) {
  const translated = language === 'es' ? translatedProducts[product.id] : null;
  const name = translated?.name || product.name;
  const description = translated?.description || product.description;
  return (
    <article className="product-card">
      <div className="product-image" aria-hidden="true"><span>{product.id === 'ceramic-mug' ? '☕' : '✦'}</span></div>
      <div className="product-card__content">
        <div className="product-card__heading"><h2>{name}</h2><span className="stock-badge">{product.stock} {text.available}</span></div>
        <p>{description}</p>
        <div className="product-card__footer"><strong>{moneyFormatter.format(product.priceInCents / 100)}</strong><button type="button">{text.viewProduct}</button></div>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [language, setLanguage] = useState('es');
  const text = copy[language];

  useEffect(() => {
    fetch('/api/products')
      .then((response) => { if (!response.ok) throw new Error('Could not load products'); return response.json(); })
      .then((payload) => { setProducts(payload.data); setStatus('ready'); })
      .catch(() => { setProducts(demoProducts); setStatus('demo'); });
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Store</span></a><div className="header-actions"><button className="language-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>{text.language}</button><button className="cart-button" type="button" aria-label={text.cart}>{text.cart} <span>0</span></button></div></header>
      <main>
        <section className="hero"><p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="hero__copy">{text.intro}</p></section>
        <section className="catalog" aria-labelledby="catalog-title"><div className="section-heading"><h2 id="catalog-title">{text.collection}</h2>{status === 'demo' && <span className="status-note">{text.localPreview}</span>}</div>{status === 'loading' && <p className="empty-state">{text.loading}</p>}{products.length > 0 && <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} text={text} language={language} />)}</div>}</section>
      </main>
      <footer className="site-footer">{text.footer}</footer>
    </div>
  );
}
