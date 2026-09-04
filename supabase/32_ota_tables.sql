-- ============================================================
-- Migration 32: OTA Module — ota_packages + ota_orders tables
-- รัน 1 ครั้ง
-- ============================================================

-- ── 1. ota_packages ────────────────────────────────────────────────────────────
create table if not exists ota_packages (
  id              text primary key,
  code            text not null,
  name            text not null,
  platform_prices jsonb not null default '[]',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create unique index if not exists idx_ota_packages_code on ota_packages(upper(code));

alter table ota_packages enable row level security;
drop policy if exists "anon read ota_packages" on ota_packages;
drop policy if exists "auth all ota_packages" on ota_packages;
create policy "anon read ota_packages"  on ota_packages for select to anon using (true);
create policy "auth all ota_packages"   on ota_packages for all to authenticated using (true) with check (true);

drop trigger if exists trg_ota_packages_updated on ota_packages;
create trigger trg_ota_packages_updated before update on ota_packages
  for each row execute function set_updated_at();

-- ── 2. ota_orders ──────────────────────────────────────────────────────────────
create table if not exists ota_orders (
  id              text primary key,
  booking_date    date not null,
  usage_date      date not null,
  order_number    text not null,
  group_number    text default '',
  pax             integer not null default 1,
  platform        text not null,
  package_id      text references ota_packages(id) on delete set null,
  package_details text,
  nationality     text,
  guide_name      text,
  pickup_hotel    text,
  gross_price     numeric(12,2) default 0,
  commission_pct  numeric(6,2)  default 0,
  discount        numeric(12,2) default 0,
  revenue         numeric(12,2) default 0,
  created_by      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_ota_orders_usage_date on ota_orders(usage_date);
create index if not exists idx_ota_orders_platform   on ota_orders(platform);
create index if not exists idx_ota_orders_booking_date on ota_orders(booking_date);

alter table ota_orders enable row level security;
drop policy if exists "anon read ota_orders" on ota_orders;
drop policy if exists "auth all ota_orders"  on ota_orders;
create policy "anon read ota_orders" on ota_orders for select to anon using (true);
create policy "auth all ota_orders"  on ota_orders for all to authenticated using (true) with check (true);

drop trigger if exists trg_ota_orders_updated on ota_orders;
create trigger trg_ota_orders_updated before update on ota_orders
  for each row execute function set_updated_at();
