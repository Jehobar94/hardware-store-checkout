import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EncryptJWT, importSPKI } from 'jose';
import { demoProducts } from './data/demo-products.js';
import { getCardBrand, isValidCardNumber } from './features/payment/card-validation.js';
import { addItem, addPurchase, removeItems, replaceItems } from './store/store.js';

const moneyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const BASE_FEE_IN_CENTS = 2000000;
const DELIVERY_FEE_IN_CENTS = 2000000;
const FREE_SHIPPING_THRESHOLD_IN_CENTS = 15000000;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

function normalizeWompiPublicKey(value) {
  const clean = value.replace(/\\n/g, ' ').replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const lines = clean.match(/.{1,64}/g)?.join('\n') || clean;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function getDeliveryFee(items) {
  const productsTotal = items.reduce((sum, item) => sum + item.product.priceInCents * item.quantity, 0);
  const hasFreeShipping = items.length > 0 && items.every((item) => item.product.freeShipping);
  return productsTotal >= FREE_SHIPPING_THRESHOLD_IN_CENTS || hasFreeShipping ? 0 : DELIVERY_FEE_IN_CENTS;
}

function getProductGallery(product) {
  const gallery = product.imageUrls || (product.image_url ? [product.image_url] : []);
  return product.slug === 'mechanical-keyboard-px1' ? gallery.slice(0, 2) : gallery;
}

function getDisplayProduct(product) {
  const isChairPromo = product.slug === 'gaming-chair-px1' || product.id === 'gaming-chair-px1';
  if (!isChairPromo) return product;
  if (product.originalPriceInCents && product.priceInCents < product.originalPriceInCents) return product;
  return { ...product, priceInCents: Math.round(product.priceInCents / 2), originalPriceInCents: product.priceInCents };
}

function normalizeCart(items, products) {
  const merged = new Map();
  items.forEach((item) => {
    const current = products.find((product) => product.id === item.product.id || product.slug === item.product.slug || product.name === item.product.name);
    if (!current) return;
    const product = getDisplayProduct(current);
    const previous = merged.get(product.id);
    merged.set(product.id, previous
      ? { ...previous, quantity: previous.quantity + item.quantity, product }
      : { ...item, product });
  });
  return [...merged.values()];
}

const copy = {
  en: {
    language: 'Español',
    cart: 'Cart',
    eyebrow: 'Technology, made simple',
    title: <>Prueba técnica<br /><em>W.</em></>,
    intro: 'Hardware elegido para trabajar, crear y disfrutar todos los días.',
    collection: 'The collection', shipping: 'Free shipping on orders over $150,000 COP',
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
    eyebrow: 'Tecnología, hecha simple',
    title: <>Prueba técnica<br /><em>W.</em></>,
    intro: 'Hardware elegido para trabajar, crear y disfrutar todos los días.',
    collection: 'La colección', shipping: 'Envío gratis en compras superiores a $150.000 COP',
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
  const gallery = getProductGallery(product);
  useEffect(() => {
    if (gallery.length < 2) return undefined;
    const timer = setInterval(() => setImageIndex((current) => (current + 1) % gallery.length), 13000);
    return () => clearInterval(timer);
  }, [gallery.length]);
  const translated = language === 'es' ? translatedProducts[product.id] : null;
  const name = translated?.name || product.name;
  const description = translated?.description || product.description;
  const isChairPromo = product.slug === 'gaming-chair-px1' || product.id === 'gaming-chair-px1';
  const displayProduct = getDisplayProduct(product);
  return (
    <article className={`product-card ${isChairPromo ? 'product-card--promo' : ''}`}>
      <div className={`product-image ${imageIndex === 0 ? 'product-image--primary' : 'product-image--info'}`} aria-label={`${name} image gallery`}>
        {gallery.length ? <img key={gallery[imageIndex]} src={gallery[imageIndex]} alt={`${name} view ${imageIndex + 1}`} /> : <span aria-hidden="true">✦</span>}
        {gallery.length > 1 && <div className="gallery-dots">{gallery.map((_, index) => <button key={index} className={index === imageIndex ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setImageIndex(index); }} aria-label={`View ${index + 1}`} type="button" />)}</div>}
      </div>
      <div className="product-card__content">
        <div className="product-card__heading"><div><h2>{name}</h2>{isChairPromo && <span className="promo-badge">50% · solo por hoy</span>}</div><span className="stock-badge">{product.stock} {text.available}</span></div>
        <p>{description}</p>
        <div className="product-card__footer"><div className="price-block">{displayProduct.originalPriceInCents && <del>{moneyFormatter.format(displayProduct.originalPriceInCents / 100)}</del>}<strong>{moneyFormatter.format(displayProduct.priceInCents / 100)}</strong></div><button type="button" onClick={(event) => { event.stopPropagation(); onSelect(displayProduct); }}>{text.viewProduct}</button></div>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [language, setLanguage] = useState('es');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const cart = useSelector((state) => state.cart);
  const purchases = useSelector((state) => state.purchases);
  const dispatch = useDispatch();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutCart, setCheckoutCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const text = copy[language];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const addToCart = (product, quantity = 1) => { dispatch(addItem({ product, quantity })); setNotice(`${product.name} se agregó al carrito`); window.setTimeout(() => setNotice(''), 2600); };
  const savePurchase = (purchase, purchasedItems = []) => {
    dispatch(addPurchase(purchase));
    dispatch(removeItems(purchasedItems.map((item) => item.product.id)));
  };
  const refreshProducts = () => fetch(apiUrl('/api/products')).then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.data) setProducts(payload.data); });

  useEffect(() => {
    fetch(apiUrl('/api/products'))
      .then((response) => { if (!response.ok) throw new Error('Could not load products'); return response.json(); })
      .then((payload) => {
        setProducts(payload.data);
        dispatch(replaceItems(normalizeCart(cart, payload.data)));
        setStatus('ready');
      })
      .catch(() => { setProducts(demoProducts); setStatus('demo'); });
  }, []);
  useEffect(() => { setDetailImageIndex(0); }, [selectedProduct]);

  if (selectedProduct) {
    const detailGallery = getProductGallery(selectedProduct);
    const detail = language === 'es' ? translatedProducts[selectedProduct.id] : null;
    const detailName = detail?.name || selectedProduct.name;
    const detailDescription = detail?.description || selectedProduct.description;
    return <div className="app-shell"><header className="site-header"><a className="brand" href="/" onClick={() => setSelectedProduct(null)}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Store</span></a><div className="header-actions"><button className="language-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>{text.language}</button><button className="purchases-button" type="button" onClick={() => setPurchasesOpen(true)}>Mis compras</button><button className="cart-button" type="button" onClick={() => setCartOpen(true)}>Carrito <span>{cartCount}</span></button></div></header><main className="product-detail"><button className="back-button" type="button" onClick={() => setSelectedProduct(null)}>← {text.back}</button><div className="detail-layout"><div className="detail-media"><div className="detail-thumbnails">{detailGallery.map((image, index) => <button key={image} type="button" className={index === detailImageIndex ? 'active' : ''} onClick={() => setDetailImageIndex(index)}><img src={image} alt={`${detailName} miniatura ${index + 1}`} /></button>)}</div><div className={`detail-gallery ${detailImageIndex === 0 ? 'detail-gallery--primary' : 'detail-gallery--info'}`}>{detailGallery.length ? <img key={detailGallery[detailImageIndex]} src={detailGallery[detailImageIndex]} alt={detailName} /> : <span aria-hidden="true">✦</span>}</div></div><section><p className="eyebrow">{language === 'es' ? 'Detalle del producto' : 'Product details'}</p><h1>{detailName}</h1><p className="detail-description">{detailDescription}</p><strong className="detail-price">{moneyFormatter.format(selectedProduct.priceInCents / 100)}</strong><p className="detail-stock">{selectedProduct.stock} {text.available}</p><label className="quantity-label">{text.quantity}<input type="number" min="1" max={selectedProduct.stock} value={selectedQuantity} onChange={(event) => setSelectedQuantity(Math.min(selectedProduct.stock, Math.max(1, Number(event.target.value) || 1)))} /></label><p className="detail-total">{language === 'es' ? 'Total' : 'Total'}: <strong>{moneyFormatter.format((selectedProduct.priceInCents * selectedQuantity) / 100)}</strong></p><div className="detail-actions"><button className="secondary-action" type="button" onClick={() => addToCart(selectedProduct, selectedQuantity)}>{text.add}</button><button className="primary-action" type="button" onClick={() => { addToCart(selectedProduct, selectedQuantity); setSelectedProduct(null); setCartOpen(true); }}>{text.payNow}</button></div></section></div></main>{cartOpen && <CartSummary cart={cart} onClose={() => setCartOpen(false)} onConfirm={(selectedItems) => { setCheckoutCart(selectedItems); setCartOpen(false); setCheckoutOpen(true); }} />}{checkoutOpen && <Checkout cart={checkoutCart} text={text} language={language} onClose={() => setCheckoutOpen(false)} onOrderCreated={savePurchase} onPaymentComplete={refreshProducts} />}{purchasesOpen && <PurchaseHistory purchases={purchases} onClose={() => setPurchasesOpen(false)} />}{notice && <div className="cart-toast" role="status"><span>✓</span>{notice}</div>}</div>;
  }

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Store</span></a><div className="header-actions"><button className="language-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>{text.language}</button><button className="purchases-button" type="button" onClick={() => setPurchasesOpen(true)}>Mis compras</button><button className="cart-button" type="button" aria-label={text.cart} onClick={() => setCartOpen(true)}>{text.cart} <span>{cartCount}</span></button></div></header>
      <main>
        <div className="shipping-banner" aria-label="Información de Store"><div className="shipping-track"><span>✦ {text.shipping}</span><span>Hola, por favor me gustaría ser parte de su equipo.</span><span>Si estás viendo esto, espero que te guste mucho este desafío técnico.</span><span>✦ {text.shipping}</span><span>Hola, por favor me gustaría ser parte de su equipo.</span><span>Si estás viendo esto, espero que te guste mucho este desafío técnico.</span></div></div>
        <section className="hero"><div className="hero-copy"><p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="hero__copy">{text.intro}</p><span className="hero-banner__note">technical challenge / 01</span></div></section>
        <section className="catalog" aria-labelledby="catalog-title"><div className="section-heading"><h2 id="catalog-title">{text.collection}</h2>{status === 'demo' && <span className="status-note">{text.localPreview}</span>}</div>{status === 'loading' && <p className="empty-state">{text.loading}</p>}{products.length > 0 && <div className="product-grid">{products.map((product) => <div key={product.id} onClick={() => { setSelectedQuantity(1); setSelectedProduct(getDisplayProduct(product)); }}><ProductCard product={product} text={text} language={language} onSelect={(item) => { setSelectedQuantity(1); setSelectedProduct(item); }} /></div>)}</div>}</section>
      </main>
      {cartOpen && <CartSummary cart={cart} onClose={() => setCartOpen(false)} onConfirm={(selectedItems) => { setCheckoutCart(selectedItems); setCartOpen(false); setCheckoutOpen(true); }} />}
      {checkoutOpen && <Checkout cart={checkoutCart} text={text} language={language} onClose={() => setCheckoutOpen(false)} onOrderCreated={savePurchase} onPaymentComplete={refreshProducts} />}
      {purchasesOpen && <PurchaseHistory purchases={purchases} onClose={() => setPurchasesOpen(false)} />}
        <footer className="site-footer"><div className="site-footer__brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>Store</strong><p>Tecnología elegida para trabajar, crear y disfrutar todos los días.</p></div><div className="site-footer__links"><span>Compra con confianza</span><span>Envíos a toda Colombia</span><span>Atención personalizada</span></div><div className="site-footer__bottom"><span>© 2026 Store</span></div></footer>
    </div>
  );
}

function CartSummary({ cart, onClose, onConfirm }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const selectedItems = cart.filter((item) => selectedIds.includes(item.product.id));
  const productsTotal = selectedItems.reduce((sum, item) => sum + item.product.priceInCents * item.quantity, 0);
  const deliveryFee = getDeliveryFee(selectedItems);
  const total = productsTotal + BASE_FEE_IN_CENTS + deliveryFee;
  return <div className="checkout-backdrop"><section className="checkout-panel cart-summary-panel" aria-label="Carrito"><button className="close-button" type="button" onClick={onClose}>×</button><p className="eyebrow">Tu selección</p><h2>Carrito</h2>{cart.length === 0 ? <p className="empty-state">Tu carrito está vacío.</p> : <><div className="cart-items">{cart.map((item) => <label className={`cart-item ${selectedIds.includes(item.product.id) ? 'is-selected' : ''}`} key={item.product.id}><input className="cart-item__selector" type="checkbox" checked={selectedIds.includes(item.product.id)} onChange={() => { setConfirmed(false); setSelectedIds((ids) => ids.includes(item.product.id) ? ids.filter((id) => id !== item.product.id) : [...ids, item.product.id]); }} /><img src={item.product.imageUrls?.[0] || item.product.image_url} alt="" /><span className="cart-item__content"><strong>{item.product.name}</strong><span>{item.quantity} × {moneyFormatter.format(item.product.priceInCents / 100)}</span></span></label>)}</div>{selectedItems.length === 0 && <p className="selection-hint">Selecciona los productos que deseas pagar.</p>}<div className="cart-breakdown"><div><span>Productos seleccionados</span><strong>{moneyFormatter.format(productsTotal / 100)}</strong></div><div><span>Tarifa base</span><strong>{selectedItems.length ? moneyFormatter.format(BASE_FEE_IN_CENTS / 100) : moneyFormatter.format(0)}</strong></div><div><span>Envío</span><strong>{deliveryFee ? moneyFormatter.format(deliveryFee / 100) : 'Gratis'}</strong></div></div><div className="cart-total"><span>Total seleccionado</span><strong>{moneyFormatter.format(total / 100)}</strong></div>{selectedItems.length > 0 && <label className="confirm-cart"><input type="radio" name="cart-confirmation" checked={confirmed} onChange={() => setConfirmed(true)} /> Confirmo que deseo continuar con esta compra</label>}<button className="primary-action full-action" type="button" onClick={() => onConfirm(selectedItems)} disabled={!confirmed || selectedItems.length === 0}>Continuar al pago</button></>}</section></div>;
}

function PurchaseHistory({ purchases, onClose }) {
  return <div className="checkout-backdrop"><section className="checkout-panel purchases-panel" aria-label="Mis compras"><button className="close-button" type="button" onClick={onClose}>×</button><p className="eyebrow">Historial</p><h2>Mis compras</h2>{purchases.length === 0 ? <p className="empty-state">Todavía no tienes compras registradas en este navegador.</p> : <div className="purchase-list">{purchases.map((purchase) => <article className="purchase-item" key={purchase.id}><div className="purchase-item__top"><strong>{purchase.items[0]?.product.name}</strong><span>{new Date(purchase.date).toLocaleDateString('es-CO')}</span></div><p>{purchase.items.reduce((sum, item) => sum + item.quantity, 0)} producto(s) · {moneyFormatter.format(purchase.total / 100)}</p><p className="delivery-estimate">Entrega estimada: 2–5 días hábiles</p><details><summary>Ver detalle</summary><div className="purchase-detail">{purchase.items.map((item) => <p key={item.product.id}>{item.product.name} × {item.quantity}</p>)}<span>Envío a: {purchase.address}, {purchase.city}</span><span>Guía: llegará a {purchase.email}</span></div></details></article>)}</div>}</section></div>;
}

function Checkout({ cart, text, onClose, onOrderCreated, onPaymentComplete }) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardholder, setCardholder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const savedCheckout = JSON.parse(localStorage.getItem('store-checkout-draft') || '{}');
  const [email, setEmail] = useState(savedCheckout.email || '');
  const [address, setAddress] = useState(savedCheckout.address || '');
  const [city, setCity] = useState(savedCheckout.city || '');
  const [phone, setPhone] = useState(savedCheckout.phone || '');
  const [acceptance, setAcceptance] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [order, setOrder] = useState(null);
  const brand = getCardBrand(cardNumber);
  const productsTotal = cart.reduce((sum, item) => sum + item.product.priceInCents * item.quantity, 0);
  const deliveryFee = getDeliveryFee(cart);
  const total = productsTotal + BASE_FEE_IN_CENTS + deliveryFee;
  useEffect(() => { localStorage.setItem('store-checkout-draft', JSON.stringify({ email, address, city, phone })); }, [email, address, city, phone]);
  useEffect(() => { fetch(apiUrl('/api/payments/acceptance')).then((response) => response.ok ? response.json() : null).then((payload) => setAcceptance(payload?.data || null)).catch(() => setAcceptance(null)); }, []);
  const handleExpiryChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };
  const handleCvcChange = (event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 3));
  const pay = async () => {
    setPaymentStatus('loading'); setPaymentMessage('');
    try {
      const [month, year] = expiry.replace(/\s/g, '').split('/');
      if (!/^\d{2}$/.test(month) || Number(month) < 1 || Number(month) > 12 || !/^\d{2}$/.test(year)) throw new Error('La fecha debe tener formato MM/AA, por ejemplo 12/30');
      const configResponse = await fetch(apiUrl('/api/payments/tokenization-config'));
      const configPayload = await configResponse.json();
      if (!configResponse.ok || !configPayload.data?.apiUrl || !configPayload.data?.publicKey) {
        throw new Error(configPayload.message || 'La configuración de pagos no está disponible');
      }
      const config = configPayload.data;
      const keyResponse = await fetch(apiUrl('/api/payments/tokenization-key'));
      const keyPayload = await keyResponse.json();
      if (!keyResponse.ok || !keyPayload.data?.publicKey) throw new Error('No fue posible obtener la llave de cifrado de Wompi');
      const tokenizationKey = await importSPKI(normalizeWompiPublicKey(keyPayload.data.publicKey), 'RSA-OAEP-256');
      const encryptedCard = await new EncryptJWT({ number: cardNumber.replace(/\D/g, ''), cvc, exp_month: month, exp_year: year, card_holder: cardholder }).setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' }).encrypt(tokenizationKey);
      const tokenResponse = await fetch(apiUrl('/api/payments/tokenize'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: encryptedCard }) });
      const tokenPayload = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenPayload.data?.id) throw new Error(tokenPayload.error?.reason || 'No fue posible tokenizar la tarjeta');
      const paymentResponse = await fetch(apiUrl('/api/orders'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })), customer: { fullName: cardholder, email, phone }, delivery: { address, city }, deliveryFee, acceptanceToken: acceptance?.presigned_acceptance?.acceptance_token, acceptPersonalAuth: acceptance?.presigned_personal_data_auth?.acceptance_token, paymentMethod: { type: 'CARD', token: tokenPayload.data.id, installments: 1 } }) });
      const paymentPayload = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(paymentPayload.message || 'No fue posible crear el pedido');
      const localTransactionId = paymentPayload.orderId;
        localStorage.setItem('store-active-transaction', JSON.stringify({ id: localTransactionId, wompiId: paymentPayload.wompi?.id, status: 'pending', createdAt: new Date().toISOString() }));
        let syncedPayment = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const syncResponse = await fetch(apiUrl(`/api/orders/${encodeURIComponent(localTransactionId)}`));
          const syncPayload = await syncResponse.json();
          if (!syncResponse.ok) throw new Error(syncPayload.message || 'No fue posible confirmar el pago del pedido');
          syncedPayment = syncPayload;
          localStorage.setItem('store-active-transaction', JSON.stringify({ id: localTransactionId, wompiId: paymentPayload.wompi?.id, status: syncPayload.status, createdAt: new Date().toISOString() }));
          if (['approved', 'declined', 'voided', 'error'].includes(syncPayload.status)) break;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      if (syncedPayment?.status !== 'approved') throw new Error(`El pedido quedó en estado ${String(syncedPayment?.status || 'pendiente').toUpperCase()}.`);
      await onPaymentComplete?.();
      localStorage.removeItem('store-active-transaction');
      localStorage.removeItem('store-checkout-draft');
      const orderId = paymentPayload.wompi?.id || paymentPayload.orderId;
      onOrderCreated({ id: orderId, date: new Date().toISOString(), email, address, city, items: cart, total }, cart);
      setOrder({ id: orderId, email, address, city, items: cart, total });
      setPaymentStatus('success'); setPaymentMessage(`Transacción creada: ${orderId}`);
    } catch (error) {
      console.error('Payment flow failed', error);
      setPaymentStatus('error');
      setPaymentMessage(error instanceof TypeError ? 'No se pudo completar la conexión con el servidor de pagos. Revisa la consola para ver el detalle.' : error.message);
    }
  };
  if (paymentStatus === 'success' && order) {
    return <div className="checkout-backdrop"><section className="checkout-panel confirmation-panel" aria-label="Confirmación de pedido"><button className="close-button" type="button" onClick={onClose}>×</button><div className="success-icon" aria-hidden="true">✓</div><p className="eyebrow">Pago confirmado</p><h2>¡Tu compra se ha efectuado con éxito!</h2><p className="confirmation-copy">Estamos preparando tu pedido. Enviaremos tu producto a:</p><div className="order-detail"><strong>{order.address}</strong><span>{order.city}</span></div><p className="confirmation-copy">Te enviaremos la guía de destino al correo <strong>{order.email}</strong>.</p><div className="tracking-card"><div className="tracking-heading"><strong>Seguimiento del pedido</strong><span>#{order.id}</span></div><ol className="tracking-list"><li className="is-active"><span>✓</span><div><strong>Pago confirmado</strong><small>Tu pago fue recibido correctamente.</small></div></li><li className="is-active"><span>2</span><div><strong>Preparando pedido</strong><small>Estamos alistando tu producto.</small></div></li><li><span>3</span><div><strong>En camino</strong><small>Te notificaremos cuando salga a despacho.</small></div></li><li><span>4</span><div><strong>Entregado</strong><small>Recibirás tu pedido en la dirección indicada.</small></div></li></ol></div><p className="thank-you">Gracias por comprar en Store.</p><button className="primary-action" type="button" onClick={onClose}>Seguir comprando</button></section></div>;
  }
  return <div className="checkout-backdrop"><section className="checkout-panel" aria-label={text.checkout}><button className="close-button" type="button" onClick={onClose}>×</button><p className="eyebrow">{text.checkout}</p><h2>{text.paymentMethod}</h2>{cart.length === 0 ? <p>{text.emptyCart}</p> : <><div className="checkout-summary">{cart.map((item) => <p key={item.product.id}>{item.product.name} × {item.quantity}</p>)}<p><span>Tarifa base</span><span>{moneyFormatter.format(BASE_FEE_IN_CENTS / 100)}</span></p><strong>{moneyFormatter.format(total / 100)}</strong></div><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@ejemplo.com" type="email" /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección de entrega" /><div className="checkout-row"><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ciudad" /><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono" /></div><div className="payment-brands"><img src="/payment-logos/visa.jpeg" alt={text.visa} /><img src="/payment-logos/mastercard.png" alt={text.mastercard} /></div><input value={cardNumber} onChange={(event) => setCardNumber(formatCardNumber(event.target.value))} placeholder={text.cardNumber} inputMode="numeric" autoComplete="cc-number" maxLength="19" /><p className={isValidCardNumber(cardNumber) ? 'valid-card' : 'card-error'}>{brand !== 'unknown' && isValidCardNumber(cardNumber) ? brand : cardNumber ? text.invalidCard : ''}</p><input value={cardholder} onChange={(event) => setCardholder(event.target.value)} placeholder={text.cardholder} autoComplete="cc-name" /><div className="checkout-row"><input value={expiry} onChange={handleExpiryChange} placeholder={text.expiry} inputMode="numeric" maxLength="5" autoComplete="cc-exp" /><input value={cvc} onChange={handleCvcChange} placeholder={text.cvc} inputMode="numeric" maxLength="3" autoComplete="cc-csc" /></div>{acceptance && <div className="terms-links"><a href={acceptance.presigned_acceptance?.permalink} target="_blank" rel="noreferrer">Términos y condiciones</a><a href={acceptance.presigned_personal_data_auth?.permalink} target="_blank" rel="noreferrer">Autorización de datos personales</a></div>}<label className="terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />{text.terms}</label>{paymentMessage && <p className={paymentStatus === 'error' ? 'card-error' : 'valid-card'}>{paymentMessage}</p>}<button className="primary-action" type="button" onClick={pay} disabled={!isValidCardNumber(cardNumber) || !accepted || !email || !address || !city || !cardholder || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvc) || paymentStatus === 'loading'}>{paymentStatus === 'loading' ? 'Procesando...' : text.pay}</button></>}</section></div>;
}
