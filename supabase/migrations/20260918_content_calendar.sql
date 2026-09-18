-- ============================================================
-- Content Calendar Tables
-- สร้างตาราง 3 ตารางสำหรับ OTA Content Calendar
-- Replaces: localStorage (ota_platforms_v1, ota_content_pillars_v2, ota_content_tasks_v2)
-- ============================================================

-- ── content_platforms: Platform ที่ใช้โพส (กำหนดได้อิสระ) ──────────────────

CREATE TABLE IF NOT EXISTS content_platforms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT 'blue',   -- ColorKey: blue|pink|green|red|yellow|orange|purple|teal|indigo|gray
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_platforms_read" ON content_platforms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "content_platforms_write" ON content_platforms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── content_pillars: Template หัวข้อประจำวันในสัปดาห์ ──────────────────────

CREATE TABLE IF NOT EXISTS content_pillars (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week  integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun … 6=Sat
  platform_id  uuid REFERENCES content_platforms(id) ON DELETE CASCADE,
  title        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_pillars_read" ON content_pillars
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "content_pillars_write" ON content_pillars
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── content_tasks: Task / หัวข้อ Content รายวัน ────────────────────────────

CREATE TABLE IF NOT EXISTS content_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,                    -- วันที่จะโพส (YYYY-MM-DD)
  title       text NOT NULL,
  notes       text NOT NULL DEFAULT '',
  platforms   jsonb NOT NULL DEFAULT '[]',      -- string[] — platform ids ที่วางแผนจะโพส
  posted_on   jsonb NOT NULL DEFAULT '[]',      -- string[] — platform ids ที่โพสแล้ว
  pillar_id   uuid REFERENCES content_pillars(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_tasks_date_idx ON content_tasks (date);

ALTER TABLE content_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_tasks_read" ON content_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "content_tasks_write" ON content_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed: Default platforms (ถ้ายังไม่มีข้อมูล) ─────────────────────────────

INSERT INTO content_platforms (id, name, color, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Facebook',  'blue',  1),
  ('00000000-0000-0000-0000-000000000002', 'Instagram', 'pink',  2),
  ('00000000-0000-0000-0000-000000000003', 'LINE',      'green', 3),
  ('00000000-0000-0000-0000-000000000004', 'YouTube',   'red',   4)
ON CONFLICT (id) DO NOTHING;
