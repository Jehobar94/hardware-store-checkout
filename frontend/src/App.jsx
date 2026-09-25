import { useEffect, useState } from 'react';
import { demoProducts } from './data/demo-products.js';
import { getCardBrand, isValidCardNumber } from './features/payment/card-validation.js';

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
    checkout: 'Checkout', cardNumber: 'Card number', cardholder: 'Cardholder name', expiry: 'MM/YY', cvc: 'CVC', pay: 'Pay securely', terms: 'I accept the payment terms', emptyCart: 'Your cart is empty', add: 'Add to cart', payNow: 'Pay now', quantity: 'Quantity', back: 'Back to products', paymentMethod: 'Payment method', visa: 'Visa', mastercard: 'Mastercard', invalidCard: 'Enter a valid card number',
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
    checkout: 'Pago', cardNumber: 'Número de tarjeta', cardholder: 'Nombre del titular', expiry: 'MM/AA', cvc: 'CVC', pay: 'Pagar de forma segura', terms: 'Acepto los términos del pago', emptyCart: 'Tu carrito está vacío', add: 'Agregar al carrito', payNow: 'Pagar ahora', quantity: 'Cantidad', back: 'Volver a productos', paymentMethod: 'Medio de pago', visa: 'Visa', mastercard: 'Mastercard', invalidCard: 'Ingresa un número válido',
  },
};

const translatedProducts = {
  'coffee-subscription': { name: 'Suscripción de café', description: 'Café fresco entregado cada mes.' },
  'ceramic-mug': { name: 'Taza de cerámica', description: 'Una taza sencilla para el ritual diario del café.' },
};

function ProductCard({ product, text, language, onSelect }) {
  const [imageIndex, setImageIndex] = useState(0);
  const gallery = product.imageUrls || (product.image_url ? [product.image_url] : []);
  const translated = language === 'es' ? translatedProducts[product.id] : null;
  const name = translated?.name || product.name;
  const description = translated?.description || product.description;
  return (
    <article className="product-card">
      <div className="product-image" aria-label={`${name} image gallery`}>
        {gallery.length ? <img src={gallery[imageIndex]} alt={`${name} view ${imageIndex + 1}`} /> : <span aria-hidden="true">✦</span>}
        {gallery.length > 1 && <div className="gallery-dots">{gallery.map((_, index) => <button key={index} className={index === imageIndex ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setImageIndex(index); }} aria-label={`View ${index + 1}`} type="button" />)}</div>}
      </div>
      <div className="product-card__content">
        <div className="product-card__heading"><h2>{name}</h2><span className="stock-badge">{product.stock} {text.available}</span></div>
        <p>{description}</p>
        <div className="product-card__footer"><strong>{moneyFormatter.format(product.priceInCents / 100)}</strong><button type="button" onClick={(event) => { event.stopPropagation(); onSelect(product); }}>{text.viewProduct}</button></div>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [language, setLanguage] = useState('es');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const text = copy[language];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const addToCart = (product, quantity = 1) => setCart((items) => [{ product, quantity }, ...items.filter((item) => item.product.id !== product.id)]);

  useEffect(() => {
    fetch('/api/products')
      .then((response) => { if (!response.ok) throw new Error('Could not load products'); return response.json(); })
      .then((payload) => { setProducts(payload.data); setStatus('ready'); })
      .catch(() => { setProducts(demoProducts); setStatus('demo'); });
  }, []);

  if (selectedProduct) {
    const detailGallery = selectedProduct.imageUrls || (selectedProduct.image_url ? [selectedProduct.image_url] : []);
    const detail = language === 'es' ? translatedProducts[selectedProduct.id] : null;
    const detailName = detail?.name || selectedProduct.name;
    const detailDescription = detail?.description || selectedProduct.description;
    return <div className="app-shell"><header className="site-header"><a className="brand" href="/" onClick={() => setSelectedProduct(null)}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Store</span></a><button className="language-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>{text.language}</button></header><main className="product-detail"><button className="back-button" type="button" onClick={() => setSelectedProduct(null)}>← {text.back}</button><div className="detail-layout"><div className="detail-gallery">{detailGallery.length ? <img src={detailGallery[0]} alt={detailName} /> : <span aria-hidden="true">✦</span>}</div><section><p className="eyebrow">{language === 'es' ? 'Detalle del producto' : 'Product details'}</p><h1>{detailName}</h1><p className="detail-description">{detailDescription}</p><strong className="detail-price">{moneyFormatter.format(selectedProduct.priceInCents / 100)}</strong><p className="detail-stock">{selectedProduct.stock} {text.available}</p><label className="quantity-label">{text.quantity}<input type="number" min="1" max={selectedProduct.stock} defaultValue="1" id="quantity" /></label><div className="detail-actions"><button className="secondary-action" type="button" onClick={() => { addToCart(selectedProduct, Number(document.getElementById('quantity').value)); setSelectedProduct(null); }}>{text.add}</button><button className="primary-action" type="button" onClick={() => { addToCart(selectedProduct, Number(document.getElementById('quantity').value)); setSelectedProduct(null); setCheckoutOpen(true); }}>{text.payNow}</button></div></section></div></main>{checkoutOpen && <Checkout cart={cart} text={text} language={language} onClose={() => setCheckoutOpen(false)} />}</div>;
  }

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Store</span></a><div className="header-actions"><button className="language-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>{text.language}</button><button className="cart-button" type="button" aria-label={text.cart} onClick={() => setCheckoutOpen(true)}>{text.cart} <span>{cartCount}</span></button></div></header>
      <main>
        <section className="hero"><p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="hero__copy">{text.intro}</p></section>
        <section className="catalog" aria-labelledby="catalog-title"><div className="section-heading"><h2 id="catalog-title">{text.collection}</h2>{status === 'demo' && <span className="status-note">{text.localPreview}</span>}</div>{status === 'loading' && <p className="empty-state">{text.loading}</p>}{products.length > 0 && <div className="product-grid">{products.map((product) => <div key={product.id} onClick={() => setSelectedProduct(product)}><ProductCard product={product} text={text} language={language} onSelect={setSelectedProduct} /></div>)}</div>}</section>
      </main>
      {checkoutOpen && <Checkout cart={cart} text={text} language={language} onClose={() => setCheckoutOpen(false)} />}
      <footer className="site-footer">{text.footer}</footer>
    </div>
  );
}

function Checkout({ cart, text, onClose }) {
  const [cardNumber, setCardNumber] = useState('');
  const brand = getCardBrand(cardNumber);
  const total = cart.reduce((sum, item) => sum + item.product.priceInCents * item.quantity, 0);
  return <div className="checkout-backdrop"><section className="checkout-panel" aria-label={text.checkout}><button className="close-button" type="button" onClick={onClose}>×</button><p className="eyebrow">{text.checkout}</p><h2>{text.paymentMethod}</h2>{cart.length === 0 ? <p>{text.emptyCart}</p> : <><div className="checkout-summary">{cart.map((item) => <p key={item.product.id}>{item.product.name} × {item.quantity}</p>)}<strong>{moneyFormatter.format(total / 100)}</strong></div><div className="payment-brands"><img src="/payment-logos/visa.jpeg" alt={text.visa} /><img src="/payment-logos/mastercard.png" alt={text.mastercard} /></div><input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder={text.cardNumber} inputMode="numeric" /><p className={isValidCardNumber(cardNumber) ? 'valid-card' : 'card-error'}>{brand !== 'unknown' && isValidCardNumber(cardNumber) ? brand : cardNumber ? text.invalidCard : ''}</p><input placeholder={text.cardholder} /><div className="checkout-row"><input placeholder={text.expiry} /><input placeholder={text.cvc} /></div><label className="terms"><input type="checkbox" />{text.terms}</label><button className="primary-action" type="button" disabled={!isValidCardNumber(cardNumber)}>{text.pay}</button></>}</section></div>;
}
