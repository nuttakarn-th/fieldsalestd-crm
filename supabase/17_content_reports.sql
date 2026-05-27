-- Content Reports: store parsed Facebook Page Insights CSV data cross-device
CREATE TABLE IF NOT EXISTS public.content_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name   text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text,
  rows_json   jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_reports_all" ON public.content_reports FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS content_reports_uploaded_at_idx ON public.content_reports (uploaded_at DESC);
