-- ============================================================
-- Migration 14: แก้ปัญหาวิกฤต — FK constraint + Missing columns
-- ============================================================
-- ปัญหาที่แก้:
-- 1. FK constraint บน created_by/assigned_to/rep ทำให้ insert fail
--    เมื่อชื่อ user ใหม่ยังไม่อยู่ใน sales_reps → ข้อมูลหาย
-- 2. leads ขาด columns: status_note, requirement_tags, followup_logs, tour_id
-- 3. ตรวจสอบว่า enum มีค่าครบ
-- ============================================================
-- วิธีใช้: รันใน Supabase SQL Editor ครั้งเดียว
-- ============================================================

-- ── 1. Drop FK constraints ที่ block insert จาก dynamic users ──
-- customers.created_by → sales_reps(name)
alter table customers
  drop constraint if exists customers_created_by_fkey,
  drop constraint if exists customers_transferred_to_fkey,
  drop constraint if exists customers_transferred_from_fkey;

-- leads.assigned_to → sales_reps(name)
alter table leads
  drop constraint if exists leads_assigned_to_fkey;

-- route_plans.rep → sales_reps(name)
alter table route_plans
  drop constraint if exists route_plans_rep_fkey;

-- monthly_targets.rep → sales_reps(name)
alter table monthly_targets
  drop constraint if exists monthly_targets_rep_fkey;

-- quotations.rep → sales_reps(name)
alter table quotations
  drop constraint if exists quotations_rep_fkey;

-- team_notifications.sales → sales_reps(name)
alter table team_notifications
  drop constraint if exists team_notifications_sales_fkey;

-- ── 2. เพิ่ม columns ที่หายไปใน leads ──
alter table leads
  add column if not exists status_note       text,
  add column if not exists requirement_tags  text[],
  add column if not exists followup_logs     jsonb   default '[]'::jsonb,
  add column if not exists tour_id           text;

-- index สำหรับ followup queries
create index if not exists idx_leads_next_followup on leads(next_followup_date);
create index if not exists idx_leads_tour_id       on leads(tour_id);

-- ── 3. ตรวจสอบ enum values ที่ขาดหายไป ──
-- "Field Sale" ใน source_t (migration 05 ควรมีแล้ว แต่ run ซ้ำได้)
do $$ begin
  alter type source_t add value if not exists 'Field Sale' before 'FB';
  exception when others then null;
end $$;

-- "ลูกค้าทั่วไป" ใน lead_category_t (migration 05 ควรมีแล้ว)
do $$ begin
  alter type lead_category_t add value if not exists 'ลูกค้าทั่วไป' before 'บริษัทเอกชน';
  exception when others then null;
end $$;

-- ── 4. เพิ่ม columns ใน customers ถ้ายังไม่มี (migration 12 อาจยังไม่ run) ──
alter table customers
  add column if not exists province           text,
  add column if not exists birthday           date,
  add column if not exists interests          text[],
  add column if not exists note               text,
  add column if not exists last_contacted_at  timestamptz;

-- ── 5. Sync ผู้ใช้งานทั้งหมดจาก app_users → sales_reps ──
-- เพื่อให้ user เก่าที่สร้างก่อน migration นี้ไม่มีปัญหา
insert into sales_reps (name, position, is_active)
select
  full_name,
  role,
  true
from app_users
where role in ('Sales', 'OB Co-ordinator', 'Sales Manager')
  and full_name is not null
  and full_name <> ''
on conflict (name) do update set
  position  = excluded.position,
  is_active = true;

-- ── 6. ตรวจสอบผลลัพธ์ ──
select 'sales_reps' as table_name, count(*) as rows from sales_reps
union all
select 'customers', count(*) from customers
union all
select 'leads', count(*) from leads;

-- Add transfer_logs jsonb column to customers (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='transfer_logs') THEN
    ALTER TABLE customers ADD COLUMN transfer_logs jsonb DEFAULT '[]';
  END IF;
END $$;
