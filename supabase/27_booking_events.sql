-- ============================================================
-- 27_booking_events.sql
-- Phase 2 Analytics — Event Log + Weekly Snapshot
-- ============================================================

-- ── 1. booking_events — log ทุกครั้งที่ quota / period เปลี่ยน ──────────────
CREATE TABLE IF NOT EXISTS booking_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT        NOT NULL,
  -- 'period_created' | 'period_updated' | 'period_deleted'
  -- | 'period_cancelled' | 'quota_adjusted'

  tour_id       TEXT        NOT NULL,
  period_id     TEXT        NOT NULL,
  tour_code     TEXT,
  country       TEXT,
  category      TEXT,
  start_date    DATE,           -- วันเดินทางของ period นี้

  old_quota     INTEGER,        -- quota ก่อนเปลี่ยน
  new_quota     INTEGER,        -- quota หลังเปลี่ยน
  delta         INTEGER,        -- new_quota - old_quota (ลบ = มีคนจอง, บวก = ยกเลิก/เพิ่มที่)
  total_seats   INTEGER,        -- ที่นั่งทั้งหมดของ period ณ เวลานั้น

  actor         TEXT,           -- ชื่อผู้ทำรายการ (updated_by)
  notes         TEXT,           -- หมายเหตุเพิ่มเติม

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index สำหรับ query เร็ว
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at
  ON booking_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_events_tour_period
  ON booking_events(tour_id, period_id);

CREATE INDEX IF NOT EXISTS idx_booking_events_start_date
  ON booking_events(start_date);

-- ── 2. period_snapshots — snapshot รายสัปดาห์ ─────────────────────────────
-- กด "บันทึก Snapshot" จากหน้า Analytics หรือ run Edge Function อัตโนมัติ
CREATE TABLE IF NOT EXISTS period_snapshots (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE    NOT NULL,   -- วันที่บันทึก snapshot
  tour_id         TEXT    NOT NULL,
  period_id       TEXT    NOT NULL,
  tour_code       TEXT,
  country         TEXT,
  category        TEXT,
  start_date      DATE,               -- วันเดินทาง
  total_seats     INTEGER NOT NULL,
  quota           INTEGER NOT NULL,   -- ที่นั่งว่าง ณ วันนั้น
  booked          INTEGER NOT NULL,   -- = total_seats - quota
  price_per_seat  NUMERIC,
  special_price   NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(snapshot_date, period_id)    -- 1 snapshot ต่อ period ต่อวัน
);

CREATE INDEX IF NOT EXISTS idx_period_snapshots_date
  ON period_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_period_snapshots_tour
  ON period_snapshots(tour_id, snapshot_date);

-- ── 3. RLS — เปิดให้ authenticated user อ่าน/เขียนได้ ────────────────────
ALTER TABLE booking_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_snapshots ENABLE ROW LEVEL SECURITY;

-- booking_events: authenticated อ่าน + เขียนได้
CREATE POLICY "auth_read_booking_events"
  ON booking_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_booking_events"
  ON booking_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- period_snapshots: authenticated อ่าน + เขียนได้
CREATE POLICY "auth_read_period_snapshots"
  ON period_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_period_snapshots"
  ON period_snapshots FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_period_snapshots"
  ON period_snapshots FOR DELETE
  USING (auth.role() = 'authenticated');
