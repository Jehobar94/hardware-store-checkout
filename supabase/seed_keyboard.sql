-- Limpia los productos de prueba anteriores y deja el teclado como producto inicial.
alter table public.transactions
add column if not exists base_fee bigint not null default 0;

delete from public.products
where slug in ('coffee-subscription', 'ceramic-mug');

alter table public.products
add column if not exists image_urls text[] not null default '{}';

alter table public.products
add column if not exists original_price_in_cents bigint;

insert into public.products (
  slug, name, description, price_in_cents, original_price_in_cents, currency, stock, image_url, image_urls
)
values (
  'mechanical-keyboard-px1',
  'Teclado mecánico PX1',
  'Teclado mecánico compacto con iluminación RGB, conexión USB y diseño cómodo para trabajar o jugar.',
  18990000,
  22990000,
  'COP',
  12,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX1.jpg',
  array[
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX1.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Teclados/TecladoPX2.jpg'
  ]
)
on conflict (slug) do update set
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  original_price_in_cents = excluded.original_price_in_cents,
  stock = excluded.stock,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  updated_at = now();

-- Segundo producto: mouse con tres vistas cargadas en Storage.
insert into public.products (
  slug, name, description, price_in_cents, original_price_in_cents, currency, stock, image_url, image_urls
)
values (
  'wireless-mouse-px1',
  'Mouse inalámbrico PX1',
  'Mouse inalámbrico ergonómico con seguimiento preciso y batería de larga duración.',
  8990000,
  10990000,
  'COP',
  10,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Mouse/Mousepx1.jpg',
  array[
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Mouse/Mousepx1.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Mouse/MousePX2.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Mouse/MousePX3.jpg'
  ]
)
on conflict (slug) do update set
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  original_price_in_cents = excluded.original_price_in_cents,
  stock = excluded.stock,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  updated_at = now();

create or replace function public.decrement_product_stock(
  p_product_id uuid,
  p_quantity_to_decrement integer
)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock = stock - p_quantity_to_decrement,
      updated_at = now()
  where id = p_product_id
    and stock >= p_quantity_to_decrement;

  if not found then
    raise exception 'insufficient stock or product not found';
  end if;
end;
$$;
