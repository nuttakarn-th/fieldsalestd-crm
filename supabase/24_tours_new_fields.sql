-- ============================================================
-- Migration 24: เพิ่ม columns ใหม่ให้ tours table
-- ที่เพิ่มเข้า TourItem interface แต่ยังไม่มีใน DB
-- title, countries, continent, tour_types, description
-- ============================================================

alter table tours
  add column if not exists title       text,
  add column if not exists countries   text[],
  add column if not exists continent   text,
  add column if not exists tour_types  text[],
  add column if not exists description text;

-- ยืนยัน columns ที่มีอยู่ทั้งหมด
select column_name, data_type
from information_schema.columns
where table_name = 'tours'
order by ordinal_position;
