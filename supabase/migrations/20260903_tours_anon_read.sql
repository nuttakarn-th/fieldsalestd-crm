-- Allow anonymous (unauthenticated) users to READ tours
-- Required for PublicCatalog (/catalog) page which loads without JWT
--
-- Run this in Supabase Dashboard → SQL Editor

CREATE POLICY "anon_select_tours"
  ON public.tours
  FOR SELECT
  TO anon
  USING (archived = false OR archived IS NULL);
