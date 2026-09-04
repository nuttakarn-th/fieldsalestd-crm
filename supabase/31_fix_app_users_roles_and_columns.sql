-- ============================================================
-- Fix 31: app_users — เพิ่ม enum roles + plain_password column
-- รันใน Supabase SQL Editor 1 ครั้ง
-- สาเหตุ: INSERT user ใหม่ล้มเหลวเงียบๆ เพราะ
--   1. app_role_t enum ขาด OB Manager / OB Co-ordinator / Marketing Manager / OTA
--   2. Column plain_password ไม่มีใน DB
-- ============================================================

-- ── 1. เพิ่ม enum values ที่ขาดหายไปใน app_role_t ─────────────────────────────
do $$ begin
  alter type app_role_t add value if not exists 'OB Manager';
  exception when others then null;
end $$;

do $$ begin
  alter type app_role_t add value if not exists 'OB Co-ordinator';
  exception when others then null;
end $$;

do $$ begin
  alter type app_role_t add value if not exists 'Marketing Manager';
  exception when others then null;
end $$;

do $$ begin
  alter type app_role_t add value if not exists 'OTA';
  exception when others then null;
end $$;

-- ── 2. เพิ่ม column plain_password (ถ้ายังไม่มี) ───────────────────────────────
alter table app_users add column if not exists plain_password text;

-- ── 3. เพิ่ม column line_qr_url + department (safety — อาจมีแล้ว) ──────────────
alter table app_users add column if not exists line_qr_url text;
alter table app_users add column if not exists department text;

-- ── 4. ตรวจสอบ — query นี้ควร return ทุก role ที่ระบบใช้ ──────────────────────
-- select unnest(enum_range(null::app_role_t));
