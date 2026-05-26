-- ============================================================
-- Gallery: add country + is_highlight columns
-- ============================================================

alter table gallery_albums
  add column if not exists country      text,
  add column if not exists is_highlight boolean default false not null;
