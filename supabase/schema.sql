-- ============================================================================
-- Esquema de Base de Datos — PWA Gestión de Inventario
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Tabla de productos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  category text,
  stock_current integer not null default 0,
  stock_min integer not null default 5,
  updated_at timestamp with time zone not null default now()
);

-- Índice para búsquedas instantáneas por código de barras y nombre
create index if not exists idx_products_barcode on public.products (barcode);
create index if not exists idx_products_name on public.products (name);

-- Trigger para actualizar updated_at automáticamente en cada UPDATE
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

-- 2. Tabla de historial de movimientos y recuentos
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

-- 3. Row Level Security (RLS)
-- MVP sin autenticación: acceso habilitado para la clave pública anon.
-- Si más adelante añades Supabase Auth, sustituye "using (true)" por "using (auth.role() = 'authenticated')".
alter table public.products enable row level security;
alter table public.inventory_logs enable row level security;

drop policy if exists "Allow public read products" on public.products;
create policy "Allow public read products"
  on public.products for select
  using (true);

drop policy if exists "Allow public insert products" on public.products;
create policy "Allow public insert products"
  on public.products for insert
  with check (true);

drop policy if exists "Allow public update products" on public.products;
create policy "Allow public update products"
  on public.products for update
  using (true)
  with check (true);

drop policy if exists "Allow public delete products" on public.products;
create policy "Allow public delete products"
  on public.products for delete
  using (true);

drop policy if exists "Allow public read inventory_logs" on public.inventory_logs;
create policy "Allow public read inventory_logs"
  on public.inventory_logs for select
  using (true);

drop policy if exists "Allow public insert inventory_logs" on public.inventory_logs;
create policy "Allow public insert inventory_logs"
  on public.inventory_logs for insert
  with check (true);

-- 4. Habilitar Supabase Realtime para sincronización PC <-> Móvil
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_logs'
  ) then
    alter publication supabase_realtime add table public.inventory_logs;
  end if;
end $$;
