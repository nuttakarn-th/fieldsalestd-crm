-- Migration 30: Campaign images cross-device sync
-- เก็บภาพประกอบ Campaign (base64) ใน Supabase เพื่อ sync ข้ามเครื่อง
CREATE TABLE IF NOT EXISTS public.campaign_images (
  group_name  text PRIMARY KEY,
  image_b64   text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.campaign_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_images_all" ON public.campaign_images FOR ALL USING (true) WITH CHECK (true);
COMMENT ON TABLE public.campaign_images IS 'ภาพประกอบแต่ละ campaign group — shared ข้ามเครื่อง';
