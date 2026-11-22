-- ============================================================================
-- Esquema de Base de Datos — PWA Gestión de Inventario (Multi-Código + Ubicaciones)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Tabla de productos (cada fila puede agrupar varios sabores/códigos)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  category text,
  location text not null default 'Tienda',
  stock_current integer not null default 0,
  stock_min integer not null default 5,
  updated_at timestamp with time zone not null default now()
);

-- Migración segura de columna location para instalaciones previas
alter table public.products
  add column if not exists location text not null default 'Tienda';

update public.products
  set location = 'Tienda'
  where location is null or location not in ('Oficina', 'Recepción', 'Tienda', 'Almacén');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_location_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_location_check
      check (location in ('Oficina', 'Recepción', 'Tienda', 'Almacén'));
  end if;
end $$;

create index if not exists idx_products_barcode on public.products (barcode);
create index if not exists idx_products_name on public.products (name);
create index if not exists idx_products_location on public.products (location);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- 2. Tabla de códigos de barras asociados a un producto (ej. distintos sabores)
create table if not exists public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  barcode text not null unique,
  variant_label text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_product_barcodes_barcode on public.product_barcodes (barcode);
create index if not exists idx_product_barcodes_product_id on public.product_barcodes (product_id);

-- Backfill seguro de códigos existentes en products hacia product_barcodes
insert into public.product_barcodes (product_id, barcode)
select id, barcode
from public.products
where barcode is not null and trim(barcode) <> ''
on conflict (barcode) do nothing;

-- 3. Tabla de historial de movimientos y recuentos
create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  previous_stock integer not null,
  counted_stock integer not null,
  difference integer generated always as (counted_stock - previous_stock) stored,
  type text not null check (type in ('audit', 'manual_adjustment', 'restock')),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_inventory_logs_product_id on public.inventory_logs (product_id);
create index if not exists idx_inventory_logs_created_at on public.inventory_logs (created_at desc);

-- 4. Row Level Security (RLS) y permisos explícitos
alter table public.products enable row level security;
alter table public.product_barcodes enable row level security;
alter table public.inventory_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant all on table public.products, public.product_barcodes, public.inventory_logs to anon, authenticated;

drop policy if exists "Allow public read products" on public.products;
create policy "Allow public read products"
  on public.products for select using (true);

drop policy if exists "Allow public insert products" on public.products;
create policy "Allow public insert products"
  on public.products for insert with check (true);

drop policy if exists "Allow public update products" on public.products;
create policy "Allow public update products"
  on public.products for update using (true) with check (true);

drop policy if exists "Allow public delete products" on public.products;
create policy "Allow public delete products"
  on public.products for delete using (true);

drop policy if exists "Allow public read product_barcodes" on public.product_barcodes;
create policy "Allow public read product_barcodes"
  on public.product_barcodes for select using (true);

drop policy if exists "Allow public insert product_barcodes" on public.product_barcodes;
create policy "Allow public insert product_barcodes"
  on public.product_barcodes for insert with check (true);

drop policy if exists "Allow public delete product_barcodes" on public.product_barcodes;
create policy "Allow public delete product_barcodes"
  on public.product_barcodes for delete using (true);

drop policy if exists "Allow public read inventory_logs" on public.inventory_logs;
create policy "Allow public read inventory_logs"
  on public.inventory_logs for select using (true);

drop policy if exists "Allow public insert inventory_logs" on public.inventory_logs;
create policy "Allow public insert inventory_logs"
  on public.inventory_logs for insert with check (true);

-- 5. Habilitar Supabase Realtime para sincronización PC <-> Móvil
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_barcodes'
  ) then
    alter publication supabase_realtime add table public.product_barcodes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_logs'
  ) then
    alter publication supabase_realtime add table public.inventory_logs;
  end if;
end $$;

-- 6. Recargar caché de esquema de PostgREST
notify pgrst, 'reload schema';
