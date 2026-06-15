-- ============================================================
-- 21_performance_indexes.sql
-- Performance indexes สำหรับ query ที่ใช้บ่อย
-- v97 — เพิ่ม index เพื่อลดเวลา query routes + customers
-- ============================================================

-- route_plans: query ตามวันที่เป็นหลัก (loadAllFromSupabase ดึง 30 วันล่าสุด)
CREATE INDEX IF NOT EXISTS idx_route_plans_route_date
  ON route_plans (route_date DESC);

-- route_stops: join กับ route_plans ผ่าน route_id
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id
  ON route_stops (route_id);

-- route_stops: query status ของแต่ละ stop (Mission merge)
CREATE INDEX IF NOT EXISTS idx_route_stops_status
  ON route_stops (status);

-- customers: filter/sort โดย Sales rep ที่สร้าง
CREATE INDEX IF NOT EXISTS idx_customers_created_by
  ON customers (created_by);

-- customers: sort ล่าสุดก่อน (default order)
CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON customers (created_at DESC);

-- customers: filter ตาม tier (VIP / Regular / New)
CREATE INDEX IF NOT EXISTS idx_customers_tier
  ON customers (customer_tier);

-- leads: join กับ customers
CREATE INDEX IF NOT EXISTS idx_leads_customer_id
  ON leads (customer_id);

-- leads: filter ตาม assigned rep
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads (assigned_to);
