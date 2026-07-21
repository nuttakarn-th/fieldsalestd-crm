-- Migration: เพิ่ม social handle columns ใน customers table
-- สำหรับเก็บชื่อ Facebook และ TikTok Username ของลูกค้า

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS fb_name          TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_username  TEXT;

COMMENT ON COLUMN customers.fb_name         IS 'ชื่อบน Facebook (ถ้า source = FB)';
COMMENT ON COLUMN customers.tiktok_username IS 'TikTok @username (ถ้า source = TikTok)';
