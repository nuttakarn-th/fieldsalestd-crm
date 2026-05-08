-- ============================================================
-- Field Sale CRM — Supabase schema
-- ============================================================
-- วิธีใช้:
--   1. เข้า Supabase Dashboard > SQL Editor
--   2. กด "New query"
--   3. คัดลอกไฟล์นี้ทั้งหมด วางแล้วกด Run
--   4. ตารางทั้งหมดจะถูกสร้าง พร้อมเปิด Row Level Security
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────
do $$ begin
  create type source_t       as enum ('FB','Line OA','Website','TikTok','Google','Walk-in','Referral','Agent');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type tier_t         as enum ('New','Regular','VIP');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type segment_t      as enum ('B2C Individual','B2C Group','B2B Agent','Corporate');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type lead_status_t  as enum ('New','Contacted','Quotation Sent','Negotiating','Closed Won','Closed Lost');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type urgency_t      as enum ('Hot','Warm','Cold');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type bu_type_t      as enum ('ทัวร์ต่างประเทศ','ทัวร์ภายในประเทศ','เช่ารถ ท่องเที่ยว','จองตั๋วเครื่องบิน');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type lead_category_t as enum ('บริษัทเอกชน','หน่วยงานราชการ','มหาวิทยาลัยเอกชน','มหาวิทยาลัยรัฐบาล');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type trip_scope_t   as enum ('Domestic','International');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type stop_status_t  as enum ('planned','in_progress','completed','skipped');
  exception when duplicate_object then null;
end $$;

do $$ begin
  create type doc_type_t     as enum ('quotation','receipt');
  exception when duplicate_object then null;
end $$;

-- ── Sales reps (เพิ่มขึ้น/ลดลงในตารางนี้) ────────────────────
create table if not exists sales_reps (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,                -- 'เฟิร์ส', 'โดนัท', 'ปาม'
  position    text,
  phone       text,
  email       text,
  avatar_color text,
  is_manager  boolean default false,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ── Customers ───────────────────────────────────────────────
create table if not exists customers (
  customer_id        text primary key,             -- 'C001'
  full_name          text not null,
  company            text,
  phone              text,
  line_id            text,
  email              text,
  source             source_t,
  segment            segment_t,
  total_trips        int default 0,
  total_spend        numeric(14,2) default 0,
  customer_tier      tier_t default 'New',
  first_contact_date date,
  created_by         text references sales_reps(name) on update cascade,
  transferred_to     text references sales_reps(name) on update cascade,
  transferred_from   text references sales_reps(name) on update cascade,
  transferred_at     timestamptz,
  created_at         timestamptz default now()
);
create index if not exists idx_customers_created_by on customers(created_by);
create index if not exists idx_customers_tier on customers(customer_tier);

-- ── Leads ───────────────────────────────────────────────────
create table if not exists leads (
  lead_id             text primary key,            -- 'L001'
  customer_id         text not null references customers(customer_id) on delete cascade,
  assigned_to         text not null references sales_reps(name) on update cascade,
  bu_type             bu_type_t,
  lead_category       lead_category_t,
  scope               trip_scope_t,
  program             text,
  pax_count           int default 0,
  travel_month        text,
  tour_type           text,
  budget_range        text,
  urgency             urgency_t,
  next_followup_date  date,
  status              lead_status_t default 'New',
  quoted_price        numeric(14,2) default 0,
  closed_date         date,
  lost_reason         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists idx_leads_customer on leads(customer_id);
create index if not exists idx_leads_assigned on leads(assigned_to);
create index if not exists idx_leads_status on leads(status);

-- ── Monthly targets ─────────────────────────────────────────
create table if not exists monthly_targets (
  month                text not null,              -- 'YYYY-MM'
  rep                  text not null references sales_reps(name) on update cascade,
  domestic_sales       numeric(14,2) default 0,
  domestic_pax         int default 0,
  international_sales  numeric(14,2) default 0,
  international_pax    int default 0,
  primary key (month, rep)
);

-- ── Routes & stops ──────────────────────────────────────────
create table if not exists route_plans (
  route_id   text primary key,                     -- 'R0001'
  rep        text not null references sales_reps(name) on update cascade,
  date       date not null,
  title      text,
  created_at timestamptz default now()
);
create index if not exists idx_routes_rep_date on route_plans(rep, date);

create table if not exists route_stops (
  stop_id          text primary key,               -- 'S0001'
  route_id         text not null references route_plans(route_id) on delete cascade,
  seq              int not null,
  customer_id      text references customers(customer_id) on delete set null,
  place_name       text,
  address          text,
  purpose          text,
  note             text,
  planned_time     text,                           -- 'HH:mm'
  status           stop_status_t default 'planned',
  started_at       timestamptz,
  completed_at     timestamptz,
  duration_min     int,
  field_photo_name text,
  field_photo_url  text,
  lat              numeric(10,7),
  lng              numeric(10,7)
);
create index if not exists idx_stops_route on route_stops(route_id);

-- ── Chat ────────────────────────────────────────────────────
create table if not exists chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  author     text not null,                        -- ชื่อ rep หรือ 'Manager'
  text       text not null,
  reply_to   uuid references chat_messages(id) on delete set null,
  mentions   text[],
  image_url  text,
  created_at timestamptz default now()
);
create index if not exists idx_chat_created on chat_messages(created_at desc);

-- ── Notifications ───────────────────────────────────────────
create table if not exists team_notifications (
  id         uuid primary key default uuid_generate_v4(),
  type       text not null,                        -- 'mission_completed' | 'customer_created'
  title      text,
  detail     text,
  sales      text references sales_reps(name) on update cascade,
  action_url text,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notif_read on team_notifications(read, created_at desc);

-- ── Quotations / Receipts ───────────────────────────────────
create table if not exists quotations (
  id               uuid primary key default uuid_generate_v4(),
  doc_type         doc_type_t not null,
  doc_no           text unique not null,
  rep              text references sales_reps(name) on update cascade,
  customer_name    text,
  customer_company text,
  customer_address text,
  customer_taxid   text,
  issue_date       date,
  valid_until      date,
  items            jsonb not null default '[]'::jsonb,  -- [{description, qty, unit_price}, ...]
  vat_percent      numeric(5,2) default 7,
  discount         numeric(14,2) default 0,
  notes            text,
  subtotal         numeric(14,2),
  vat_amount       numeric(14,2),
  total            numeric(14,2),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── updated_at trigger ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_leads_updated      on leads;
create trigger trg_leads_updated      before update on leads      for each row execute function set_updated_at();

drop trigger if exists trg_quotations_updated on quotations;
create trigger trg_quotations_updated before update on quotations for each row execute function set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
-- เริ่มต้น: เปิด RLS แต่ทุกคนที่ login แล้วเห็นข้อมูลทั้งหมด
-- ปรับให้แคบลงเมื่อระบบ Auth พร้อมใช้
alter table sales_reps        enable row level security;
alter table customers         enable row level security;
alter table leads             enable row level security;
alter table monthly_targets   enable row level security;
alter table route_plans       enable row level security;
alter table route_stops       enable row level security;
alter table chat_messages     enable row level security;
alter table team_notifications enable row level security;
alter table quotations        enable row level security;

-- policy ตัวอย่าง: authenticated user อ่าน/เขียนได้หมด
do $$ declare t text;
begin
  for t in select unnest(array[
    'sales_reps','customers','leads','monthly_targets',
    'route_plans','route_stops','chat_messages',
    'team_notifications','quotations'
  ]) loop
    execute format('drop policy if exists "auth read" on %I', t);
    execute format('create policy "auth read" on %I for select using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "auth write" on %I', t);
    execute format('create policy "auth write" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

-- ── Seed sales reps ─────────────────────────────────────────
insert into sales_reps (name, position, phone, email, avatar_color) values
  ('เฟิร์ส', 'Senior Sales Executive', '0812345678', 'first@fieldsale.co', 'from-pink-400 to-purple-500'),
  ('โดนัท', 'Sales Executive',        '0823456789', 'donut@fieldsale.co', 'from-amber-400 to-pink-500'),
  ('ปาม',   'Sales Executive',        '0834567890', 'palm@fieldsale.co',  'from-purple-400 to-indigo-500')
on conflict (name) do nothing;

insert into sales_reps (name, position, phone, email, is_manager) values
  ('Manager', 'Sales Manager', '0800000000', 'manager@fieldsale.co', true)
on conflict (name) do nothing;
