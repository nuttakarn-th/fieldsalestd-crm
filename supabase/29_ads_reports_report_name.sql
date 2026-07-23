-- Migration 29: Add report_name column to ads_reports
-- ใช้ชื่อรายงานที่ user ตั้งเอง (เช่น "กรกฎาคม 2026")
ALTER TABLE public.ads_reports ADD COLUMN IF NOT EXISTS report_name text;
COMMENT ON COLUMN public.ads_reports.report_name IS 'ชื่อรายงานที่ user ตั้งเอง — ใช้แสดงแทน period_label';
