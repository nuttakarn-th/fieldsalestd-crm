-- Migration: สร้างตาราง marketing_revenue_actual
-- ใช้เก็บยอดจริง (actual) + เป้า (target) สำหรับ รถเช่า / จองตั๋ว รายเดือน
-- OB Tours target ใช้จาก monthly_targets (rep = 'OB Team') ไม่ต้องเก็บที่นี่

CREATE TABLE IF NOT EXISTS marketing_revenue_actual (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  month          TEXT        NOT NULL,             -- "YYYY-MM"
  ob_actual      NUMERIC,                          -- ยอดจริงทัวร์ OB
  rental_target  NUMERIC,                          -- เป้ารถเช่า
  rental_actual  NUMERIC,                          -- ยอดจริงรถเช่า
  ticket_target  NUMERIC,                          -- เป้าจองตั๋ว
  ticket_actual  NUMERIC,                          -- ยอดจริงจองตั๋ว
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month)
);

-- RLS: อนุญาตให้ authenticated users อ่าน/เขียนได้
ALTER TABLE marketing_revenue_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_marketing_revenue"
  ON marketing_revenue_actual FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_upsert_marketing_revenue"
  ON marketing_revenue_actual FOR ALL
  USING (auth.role() = 'authenticated');
