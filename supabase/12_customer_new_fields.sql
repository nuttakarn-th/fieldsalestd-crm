-- Migration 12: Add marketing fields to customers table
-- Run in Supabase SQL Editor

alter table customers
  add column if not exists province           text,
  add column if not exists birthday           date,
  add column if not exists interests          text[],
  add column if not exists note               text,
  add column if not exists last_contacted_at  timestamptz;

-- Index for geo-targeting queries
create index if not exists idx_customers_province on customers(province);

-- Index for birthday campaigns
create index if not exists idx_customers_birthday on customers(birthday);

-- Index for last contacted (dormant lead tracking)
create index if not exists idx_customers_last_contacted on customers(last_contacted_at desc);
