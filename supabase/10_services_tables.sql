-- ============================================================
-- Service catalog tables (All Service page)
-- ============================================================

-- Tours
create table if not exists tours (
  id              text primary key,
  category        text not null,
  code            text not null,
  city            text,
  country         text,
  period          text,
  duration        text,
  price_per_seat  numeric(14,2) default 0,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- Cars
create table if not exists cars (
  id              text primary key,
  name            text not null,
  type            text,
  total_seats     integer default 0,
  rate_per_day    numeric(14,2) default 0,
  seat_material   text,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- Flights
create table if not exists flights (
  id              text primary key,
  airline         text not null,
  route           text,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- Hotels
create table if not exists hotels (
  id              text primary key,
  name            text not null,
  city            text,
  country         text,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- Visas
create table if not exists visas (
  id              text primary key,
  visa_type       text not null,
  country         text,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- Insurances
create table if not exists insurances (
  id              text primary key,
  plan_name       text not null,
  coverage        text,
  price           numeric(14,2) default 0,
  note            text,
  quota           integer default 0,
  created_at      timestamptz default now()
);

-- RLS open for dev (use auth-based later)
do $$ declare t text;
begin
  for t in select unnest(array['tours','cars','flights','hotels','visas','insurances']) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "open read" on %I', t);
    execute format('drop policy if exists "open write" on %I', t);
    execute format('create policy "open read" on %I for select using (true)', t);
    execute format('create policy "open write" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
