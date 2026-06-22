-- ─────────────────────────────────────────────────────────────────────────────
-- v180: Add Check-in / Check-out support to route_plans
-- ─────────────────────────────────────────────────────────────────────────────

-- New columns on route_plans
alter table route_plans
  add column if not exists has_checkin   boolean      not null default true,
  add column if not exists has_checkout  boolean      not null default true,
  add column if not exists checkin_at    timestamptz,
  add column if not exists checkout_at   timestamptz,
  add column if not exists checkin_lat   float8,
  add column if not exists checkin_lng   float8,
  add column if not exists checkout_lat  float8,
  add column if not exists checkout_lng  float8;

-- Index for manager "who hasn't checked in today?" query
create index if not exists idx_routes_checkin
  on route_plans(date, rep, checkin_at);

comment on column route_plans.has_checkin  is 'Sales เลือกว่าวันนี้จะเริ่มจากออฟฟิศ (Check-in GPS required)';
comment on column route_plans.has_checkout is 'Sales เลือกว่าวันนี้จะกลับออฟฟิศ (Check-out GPS required)';
comment on column route_plans.checkin_at   is 'เวลา Check-in จริง (ต้องอยู่ในรัศมี 200m จากออฟฟิศ)';
comment on column route_plans.checkout_at  is 'เวลา Check-out จริง (ต้องอยู่ในรัศมี 200m จากออฟฟิศ)';
comment on column route_plans.checkin_lat  is 'GPS Latitude ณ เวลา Check-in';
comment on column route_plans.checkin_lng  is 'GPS Longitude ณ เวลา Check-in';
comment on column route_plans.checkout_lat is 'GPS Latitude ณ เวลา Check-out';
comment on column route_plans.checkout_lng is 'GPS Longitude ณ เวลา Check-out';
