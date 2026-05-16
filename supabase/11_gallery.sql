-- ============================================================
-- Gallery — album + photo tables
-- ============================================================

create table if not exists gallery_albums (
  id              text primary key,
  name            text not null,
  description     text,
  cover_url       text,
  created_by      text not null,
  created_by_name text not null,
  created_at      timestamptz default now()
);

create table if not exists gallery_photos (
  id          text primary key,
  album_id    text not null references gallery_albums(id) on delete cascade,
  url         text not null,
  caption     text,
  uploaded_by text not null,
  uploaded_at timestamptz default now()
);

create index if not exists idx_gallery_photos_album on gallery_photos(album_id);

-- RLS open for dev
do $$ declare t text;
begin
  for t in select unnest(array['gallery_albums','gallery_photos']) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "open read" on %I', t);
    execute format('drop policy if exists "open write" on %I', t);
    execute format('create policy "open read" on %I for select using (true)', t);
    execute format('create policy "open write" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
