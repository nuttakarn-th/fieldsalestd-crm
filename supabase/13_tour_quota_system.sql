-- Migration 13: Tour quota system
-- เพิ่ม total_seats ใน tours และ tour_id ใน leads
-- Run in Supabase SQL Editor

-- 1) เพิ่ม total_seats ใน tours (ที่นั่งสูงสุด คงที่)
alter table tours
  add column if not exists total_seats integer not null default 0;

-- ถ้า total_seats ยังเป็น 0 (record เก่า) → copy จาก quota
update tours set total_seats = quota where total_seats = 0 and quota > 0;

-- 2) เพิ่ม tour_id ใน leads (FK อ้างอิง TourItem.id แบบ soft — ไม่บังคับ FK constraint)
alter table leads
  add column if not exists tour_id text;

-- Index เพื่อค้นหา leads ของ tour ได้เร็ว
create index if not exists idx_leads_tour_id on leads(tour_id);

-- Index โควต้า tours
create index if not exists idx_tours_quota on tours(quota);
