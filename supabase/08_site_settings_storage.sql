-- ============================================================
-- Site Settings (single-row JSON) + Storage bucket for PDFs
-- ============================================================

-- 1) Site settings table (key-value but as single JSON payload)
create table if not exists site_settings (
  id          text primary key default 'default',
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

drop trigger if exists trg_site_settings_updated on site_settings;
create trigger trg_site_settings_updated before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;
drop policy if exists "auth read"  on site_settings;
drop policy if exists "auth write" on site_settings;
drop policy if exists "open read"  on site_settings;
drop policy if exists "open write" on site_settings;
create policy "open read"  on site_settings for select using (true);
create policy "open write" on site_settings for all using (true) with check (true);

-- Seed initial empty row
insert into site_settings (id, payload) values ('default', '{}'::jsonb)
  on conflict (id) do nothing;

-- 2) Storage bucket for presentation PDFs (public read)
insert into storage.buckets (id, name, public)
values ('presentations', 'presentations', true)
on conflict (id) do nothing;

-- Storage RLS — open for dev
drop policy if exists "open read presentations" on storage.objects;
drop policy if exists "open write presentations" on storage.objects;
create policy "open read presentations"  on storage.objects for select using (bucket_id = 'presentations');
create policy "open write presentations" on storage.objects for all
  using (bucket_id = 'presentations') with check (bucket_id = 'presentations');
