-- v154: Audit trail — เพิ่ม updated_at, updated_by, created_by ใน tours table
-- periods JSONB จะมี updated_at/updated_by/created_by ฝังอยู่ใน object แต่ละ period อัตโนมัติ

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by  TEXT,
  ADD COLUMN IF NOT EXISTS created_by  TEXT;

-- trigger: auto-set updated_at เมื่อมีการ UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tours_set_updated_at ON tours;
CREATE TRIGGER tours_set_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN tours.updated_at IS 'วันเวลาล่าสุดที่แก้ไข (auto)';
COMMENT ON COLUMN tours.updated_by  IS 'ชื่อผู้ใช้ที่แก้ไขล่าสุด';
COMMENT ON COLUMN tours.created_by  IS 'ชื่อผู้ใช้ที่สร้าง';
