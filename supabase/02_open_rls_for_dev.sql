-- ============================================================
-- DEV ONLY — เปิด RLS ให้ anon role เข้าถึงได้ทั้งหมด
-- ============================================================
-- เพราะยังไม่ได้ตั้ง Supabase Auth — schema เดิมต้องการ authenticated user
-- ทำให้ frontend (ใช้ anon key) ยิง query ไม่ผ่าน RLS
--
-- รันไฟล์นี้ครั้งเดียวเพื่อให้แอปเข้าถึงข้อมูลได้
-- เมื่อไหร่ทำ Auth จริง ค่อยรัน revert: 03_strict_rls_when_auth_ready.sql
-- ============================================================

do $$ declare t text;
begin
  for t in select unnest(array[
    'sales_reps','customers','leads','monthly_targets',
    'route_plans','route_stops','chat_messages',
    'team_notifications','quotations'
  ]) loop
    execute format('drop policy if exists "auth read" on %I', t);
    execute format('drop policy if exists "auth write" on %I', t);
    execute format('drop policy if exists "open read" on %I', t);
    execute format('drop policy if exists "open write" on %I', t);
    execute format('create policy "open read" on %I for select using (true)', t);
    execute format('create policy "open write" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
