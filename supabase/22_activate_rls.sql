-- ============================================================
-- v111: เปิด RLS จริง — ใช้ custom JWT แทน Supabase Auth
-- ============================================================
-- ต้องการ: Edge Function sign-jwt deploy แล้ว
-- JWT claims: role='authenticated', app_role=<role>, full_name=<name>
--
-- Tables ที่ต้อง authenticated:
--   sales_reps, customers, leads, monthly_targets,
--   route_plans, route_stops, chat_messages,
--   team_notifications, quotations
--
-- app_users: anon อ่านได้ (bootstrap login) แต่เขียนต้อง authenticated
-- ============================================================

-- ── 1. ปิด open policy ทุกตาราง + เปิด authenticated-only ──────────────────
do $$ declare t text;
begin
  for t in select unnest(array[
    'sales_reps','customers','leads','monthly_targets',
    'route_plans','route_stops','chat_messages',
    'team_notifications','quotations',
    'bot_qa','site_settings','customer_delete_requests',
    'ads_reports','content_reports'
  ]) loop
    execute format('drop policy if exists "open read" on %I', t);
    execute format('drop policy if exists "open write" on %I', t);
    execute format('drop policy if exists "auth read" on %I', t);
    execute format('drop policy if exists "auth write" on %I', t);
    execute format('create policy "auth read" on %I for select to authenticated using (true)', t);
    execute format('create policy "auth write" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── 2. app_users: anon SELECT (bootstrap) + authenticated ALL ───────────────
drop policy if exists "open read" on app_users;
drop policy if exists "open write" on app_users;
drop policy if exists "auth read" on app_users;
drop policy if exists "auth write" on app_users;
drop policy if exists "anon read users" on app_users;
drop policy if exists "auth write users" on app_users;

-- anon ยังอ่านได้: จำเป็นสำหรับ loadUsersFromSupabase() ก่อน login
create policy "anon read users" on app_users
  for select to anon using (true);

-- authenticated อ่าน-เขียนได้ทั้งหมด (User Management)
create policy "auth all users" on app_users
  for all to authenticated using (true) with check (true);

-- ── 3. Route-level RLS: Sales เห็นแค่ routes ของตัวเอง ────────────────────
-- (ทำซ้ำ policy ที่เพิ่งสร้างเพื่อให้ละเอียดยิ่งขึ้น)
drop policy if exists "auth read" on route_plans;
create policy "auth read" on route_plans
  for select to authenticated
  using (
    (auth.jwt() ->> 'app_role') in ('Sales Manager', 'Admin', 'Marketing', 'OB Co-ordinator')
    or rep = (auth.jwt() ->> 'full_name')
  );

-- ── 4. Customer-level RLS: Sales เห็นแค่ลูกค้าของตัวเอง ────────────────────
drop policy if exists "auth read" on customers;
create policy "auth read" on customers
  for select to authenticated
  using (
    (auth.jwt() ->> 'app_role') in ('Sales Manager', 'Admin', 'Marketing', 'OB Co-ordinator')
    or created_by = (auth.jwt() ->> 'full_name')
    or transferred_to = (auth.jwt() ->> 'full_name')
  );
