
CREATE TABLE IF NOT EXISTS public.customer_rebook_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE,
  last_reminder_sent_at timestamptz NOT NULL DEFAULT now(),
  last_completed_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_rebook_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rebook reminders"
  ON public.customer_rebook_reminders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own reminder record"
  ON public.customer_rebook_reminders FOR SELECT
  USING (customer_id = auth.uid());
