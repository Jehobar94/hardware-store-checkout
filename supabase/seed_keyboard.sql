-- Producto de prueba usando las tres vistas cargadas en Storage.
insert into public.products (
  slug, name, description, price_in_cents, currency, stock, image_url
)
values (
  'mechanical-keyboard-px1',
  'Teclado mecánico PX1',
  'Teclado mecánico compacto con iluminación RGB, conexión USB y diseño cómodo para trabajar o jugar.',
  18990000,
  'COP',
  12,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX1.jpg'
)
on conflict (slug) do update set
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  stock = excluded.stock,
  image_url = excluded.image_url,
  updated_at = now();
