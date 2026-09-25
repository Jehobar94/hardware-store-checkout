-- Pedidos, productos asociados y actualización de inventario.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  delivery_id uuid not null references public.deliveries(id),
  product_amount bigint not null,
  base_fee bigint not null default 0,
  delivery_fee bigint not null default 0,
  total_amount bigint not null,
  currency text not null default 'COP',
  status text not null default 'pending',
  wompi_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price_in_cents bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);

alter table public.products
add column if not exists free_shipping boolean not null default false;

insert into public.products (
  slug, name, description, price_in_cents, original_price_in_cents, currency, stock, image_url, image_urls, free_shipping
)
values
(
  'gaming-chair-px1',
  'Silla gamer PX1',
  'Silla gamer ergonómica con soporte envolvente para largas jornadas de trabajo y juego.',
  20000000,
  40000000,
  'COP',
  5,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Silla/SillaGamerPX1.jpg',
  array[
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Silla/SillaGamerPX1.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Silla/SIllaGamerpx2.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Silla/SilaGamerPX3.jpg'
  ],
  false
),
(
  'gaming-desk-px1',
  'Escritorio gamer PX1',
  'Escritorio gamer amplio y resistente para organizar tu estación de trabajo o juego.',
  98000000,
  120000000,
  'COP',
  20,
  'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Escritorios/EscritorioGamerpx1.webp',
  array[
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Escritorios/EscritorioGamerpx1.webp',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Escritorios/EscritorioGamerPX2.jpg',
    'https://oveytbyzsfuhievhyrtn.supabase.co/storage/v1/object/public/Store/Escritorios/EscritorioGAmerPX3.jpg'
  ],
  true
)
on conflict (slug) do update set
  price_in_cents = excluded.price_in_cents,
  original_price_in_cents = excluded.original_price_in_cents,
  stock = excluded.stock,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  free_shipping = excluded.free_shipping,
  updated_at = now();

create or replace function public.decrement_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare item record;
begin
  for item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    update public.products set stock = stock - item.quantity, updated_at = now()
      where id = item.product_id and stock >= item.quantity;
    if not found then raise exception 'insufficient stock or product not found'; end if;
  end loop;
end;
$$;

revoke all on function public.decrement_order_stock(uuid) from public, anon, authenticated;
