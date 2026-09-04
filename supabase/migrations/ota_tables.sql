-- ============================================================
-- OTA Module Tables
-- Run this AFTER Supabase quota resets (Sep 17, 2026+)
-- ============================================================

-- ── ota_packages: Master data โปรแกรมทัวร์ + ราคาแต่ละ Platform ────────────

CREATE TABLE IF NOT EXISTS ota_packages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,           -- เช่น CMP, CMC
  name            text NOT NULL,                  -- ชื่อเต็ม
  platform_prices jsonb NOT NULL DEFAULT '[]',    -- [{platform, price}]
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ota_packages ENABLE ROW LEVEL SECURITY;

-- อ่านได้ทุก authenticated user
CREATE POLICY "ota_packages_read" ON ota_packages
  FOR SELECT TO authenticated USING (true);

-- เขียนได้เฉพาะ OTA + Admin (จัดการผ่าน app role — ใส่ RLS แบบ open write ไว้ก่อน)
CREATE POLICY "ota_packages_write" ON ota_packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── ota_orders: บันทึก OTA Orders รายวัน ────────────────────────────────────

CREATE TABLE IF NOT EXISTS ota_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date    date NOT NULL,
  usage_date      date NOT NULL,
  order_number    text NOT NULL,
  group_number    text,
  pax             integer NOT NULL DEFAULT 1,
  platform        text NOT NULL,                  -- Trip.com | KKday | Agent Offline | GetYourGuide | Viator | Airbnb
  package_id      uuid REFERENCES ota_packages(id) ON DELETE SET NULL,
  package_details text,
  nationality     text,
  guide_name      text,
  revenue         numeric(12,2) NOT NULL DEFAULT 0,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ota_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ota_orders_read" ON ota_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ota_orders_write" ON ota_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index สำหรับ filter by usage_date (เรียงรายเดือน)
CREATE INDEX IF NOT EXISTS idx_ota_orders_usage_date ON ota_orders (usage_date);
CREATE INDEX IF NOT EXISTS idx_ota_orders_booking_date ON ota_orders (booking_date);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ota_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ota_packages_updated_at
  BEFORE UPDATE ON ota_packages
  FOR EACH ROW EXECUTE FUNCTION update_ota_updated_at();

CREATE TRIGGER ota_orders_updated_at
  BEFORE UPDATE ON ota_orders
  FOR EACH ROW EXECUTE FUNCTION update_ota_updated_at();
