-- Migration 28: Extend ads_reports table for multi-period + comparison support
-- เพิ่ม column ที่ขาดใน table ads_reports เดิม (16_ads_reports.sql)

ALTER TABLE public.ads_reports
  ADD COLUMN IF NOT EXISTS period_label text,
  ADD COLUMN IF NOT EXISTS start_date   text,
  ADD COLUMN IF NOT EXISTS end_date     text,
  ADD COLUMN IF NOT EXISTS col_map      jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index สำหรับ query ตาม period
CREATE INDEX IF NOT EXISTS ads_reports_period_idx ON public.ads_reports (period_label);

-- Comment
COMMENT ON TABLE public.ads_reports IS 'Meta Ads CSV report data — shared across Marketing team';
COMMENT ON COLUMN public.ads_reports.rows_json   IS 'Array of parsed AdRow objects from CSV';
COMMENT ON COLUMN public.ads_reports.col_map     IS 'ColumnMap: maps column names to indices detected from CSV';
COMMENT ON COLUMN public.ads_reports.period_label IS 'Human-readable period string e.g. "1/7/2026 – 21/7/2026"';
