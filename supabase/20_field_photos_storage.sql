-- ============================================================
-- Migration 20: field-photos Storage bucket
-- รูปภาพหน้างานจาก Sales Mission → อัปโหลดเป็น public URL
-- ถาวร ไม่หายหลัง reload (แก้ปัญหา data URL ถูก strip)
-- ============================================================

-- 1. สร้าง bucket "field-photos" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-photos',
  'field-photos',
  true,                             -- public = อ่านได้โดยไม่ต้อง auth
  524288,                           -- 512 KB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 524288,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. RLS Policy: ทุกคน read ได้ (public)
CREATE POLICY "field_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'field-photos');

-- 3. RLS Policy: authenticated users upload ได้
CREATE POLICY "field_photos_authenticated_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'field-photos');

-- 4. RLS Policy: authenticated users update ได้
CREATE POLICY "field_photos_authenticated_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'field-photos');

-- 5. RLS Policy: authenticated users delete ได้
CREATE POLICY "field_photos_authenticated_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'field-photos');
