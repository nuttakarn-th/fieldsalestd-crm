-- Ads Reports: store parsed Excel data cross-device
CREATE TABLE IF NOT EXISTS public.ads_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name   text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text,
  rows_json   jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.ads_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_reports_all" ON public.ads_reports FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS ads_reports_uploaded_at_idx ON public.ads_reports (uploaded_at DESC);
