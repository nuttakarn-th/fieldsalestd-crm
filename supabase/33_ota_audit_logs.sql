-- ============================================================
-- Migration 33: OTA Audit Logs — shared across all users
-- ทุก role (OTA, Marketing) เห็น activity ของทีมทั้งหมด
-- รัน 1 ครั้ง
-- ============================================================

create table if not exists ota_audit_logs (
  id         text primary key,              -- audit-{timestamp}-{random}
  action     text not null,                 -- OTAAuditAction
  actor      text not null default '',      -- display name ของผู้ทำ
  detail     text not null default '',      -- human-readable description
  order_id   text,                          -- optional ref to ota_orders.id
  created_at timestamptz default now()
);

create index if not exists idx_ota_audit_logs_created_at
  on ota_audit_logs(created_at desc);

alter table ota_audit_logs enable row level security;

drop policy if exists "anon read ota_audit_logs" on ota_audit_logs;
drop policy if exists "auth all ota_audit_logs"  on ota_audit_logs;

create policy "anon read ota_audit_logs"
  on ota_audit_logs for select to anon using (true);

create policy "auth all ota_audit_logs"
  on ota_audit_logs for all to authenticated using (true) with check (true);

-- Enable Realtime so all connected clients receive new entries instantly
alter publication supabase_realtime add table ota_audit_logs;
