-- v52: Customer Delete Request — 2-step approval flow
-- Sales requests deletion → Manager approves → customer removed

CREATE TABLE IF NOT EXISTS public.customer_delete_requests (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   text    NOT NULL,
  customer_name text    NOT NULL,
  requested_by  text    NOT NULL,
  reason        text,
  status        text    DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cdr_status_idx    ON public.customer_delete_requests (status);
CREATE INDEX IF NOT EXISTS cdr_customer_idx  ON public.customer_delete_requests (customer_id);
CREATE INDEX IF NOT EXISTS cdr_requester_idx ON public.customer_delete_requests (requested_by);

ALTER TABLE public.customer_delete_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdr_all" ON public.customer_delete_requests;
CREATE POLICY "cdr_all" ON public.customer_delete_requests
  FOR ALL USING (true) WITH CHECK (true);
