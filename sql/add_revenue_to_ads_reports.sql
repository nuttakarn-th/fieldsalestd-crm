-- Migration: เพิ่ม revenue fields ใน ads_reports
-- วันที่: 2026-08-05
-- ใช้สำหรับคำนวณ ROAS, ROI, Cost per Booking, Inbox Close Rate

ALTER TABLE ads_reports ADD COLUMN IF NOT EXISTS inbox_revenue  NUMERIC;
ALTER TABLE ads_reports ADD COLUMN IF NOT EXISTS deals_closed   INTEGER;
ALTER TABLE ads_reports ADD COLUMN IF NOT EXISTS total_inbox    INTEGER;
