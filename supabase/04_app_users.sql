-- ============================================================
-- App Users — เก็บ user accounts ของระบบ (แยกจาก Supabase Auth)
-- ============================================================
-- ใช้ table นี้สำหรับ login/role/password (hash)
-- ในอนาคตเปลี่ยนไป Supabase Auth จริงได้ โดยใช้ table นี้เป็น "profiles"
-- ============================================================

do $$ begin
  create type app_role_t as enum (
    'Admin', 'Sales Manager', 'Sales', 'Marketing', 'Co-Ordinator', 'Accounting'
  );
  exception when duplicate_object then null;
end $$;

create table if not exists app_users (
  user_id        text primary key,                    -- 'std-001'
  full_name      text not null,
  username       text not null unique,
  password_hash  text not null,                       -- PBKDF2-SHA256 base64
  role           app_role_t not null,
  email          text,
  tel            text,
  avatar_url     text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_app_users_username on app_users(lower(username));

-- updated_at trigger
drop trigger if exists trg_app_users_updated on app_users;
create trigger trg_app_users_updated before update on app_users
  for each row execute function set_updated_at();

-- RLS
alter table app_users enable row level security;
drop policy if exists "auth read" on app_users;
drop policy if exists "auth write" on app_users;
drop policy if exists "open read" on app_users;
drop policy if exists "open write" on app_users;
create policy "open read"  on app_users for select using (true);
create policy "open write" on app_users for all using (true) with check (true);
