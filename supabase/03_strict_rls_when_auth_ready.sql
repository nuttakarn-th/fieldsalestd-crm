-- ============================================================
-- Production — ปิด RLS ให้ authenticated user เท่านั้น
-- ============================================================
-- รันเมื่อทำ Supabase Auth เสร็จแล้ว (มี user login จริง)
-- ============================================================

do $$ declare t text;
begin
  for t in select unnest(array[
    'sales_reps','customers','leads','monthly_targets',
    'route_plans','route_stops','chat_messages',
    'team_notifications','quotations'
  ]) loop
    execute format('drop policy if exists "open read" on %I', t);
    execute format('drop policy if exists "open write" on %I', t);
    execute format('drop policy if exists "auth read" on %I', t);
    execute format('drop policy if exists "auth write" on %I', t);
    execute format('create policy "auth read" on %I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "auth write" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;
