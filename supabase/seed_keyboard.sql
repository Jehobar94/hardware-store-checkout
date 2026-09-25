-- Limpia los productos de prueba anteriores y deja el teclado como producto inicial.
delete from public.products
where slug in ('coffee-subscription', 'ceramic-mug');

alter table public.products
add column if not exists image_urls text[] not null default '{}';

insert into public.products (
  slug, name, description, price_in_cents, currency, stock, image_url, image_urls
)
values (
  'mechanical-keyboard-px1',
  'Teclado mecánico PX1',
  'Teclado mecánico compacto con iluminación RGB, conexión USB y diseño cómodo para trabajar o jugar.',
  18990000,
  'COP',
  12,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX1.jpg',
  array[
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX1.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX2.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX3.jpg'
  ]
)
on conflict (slug) do update set
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  stock = excluded.stock,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  updated_at = now();
