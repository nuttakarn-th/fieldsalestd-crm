-- Migration 25: Fix tour-pdfs storage policies
-- Problem: old policies required "authenticated" role via JWT,
--          but custom APP_JWT_SECRET may not be validated by Supabase Storage auth layer.
-- Fix: open write policy (same pattern as presentations bucket)
--      app-level auth (canEdit check) is enforced in React, not storage.

-- Remove old restrictive policies
drop policy if exists "tour_pdfs_auth_upload" on storage.objects;
drop policy if exists "tour_pdfs_auth_delete" on storage.objects;
drop policy if exists "tour_pdfs_public_read"  on storage.objects;

-- Open read for everyone
create policy "tour_pdfs_open_read"
  on storage.objects for SELECT
  using (bucket_id = 'tour-pdfs');

-- Open write for all (INSERT / UPDATE / DELETE)
create policy "tour_pdfs_open_write"
  on storage.objects for ALL
  using (bucket_id = 'tour-pdfs')
  with check (bucket_id = 'tour-pdfs');
