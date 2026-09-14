CREATE TABLE public.autopay_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'ezeepay',
  provider_token TEXT,
  card_brand TEXT,
  last_four TEXT,
  exp_month INT,
  exp_year INT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autopay_payment_methods TO authenticated;
GRANT ALL ON public.autopay_payment_methods TO service_role;
ALTER TABLE public.autopay_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own saved cards"
  ON public.autopay_payment_methods FOR ALL TO authenticated
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE TRIGGER set_autopay_payment_methods_updated_at
  BEFORE UPDATE ON public.autopay_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.autopay_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  day_of_month INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  title TEXT NOT NULL,
  description TEXT,
  parish TEXT NOT NULL,
  community TEXT,
  location TEXT NOT NULL,
  lawn_size TEXT,
  preferred_time TEXT,
  payment_method_id UUID REFERENCES public.autopay_payment_methods(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  last_job_id UUID,
  failure_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_autopay_schedules_due ON public.autopay_schedules (active, next_run_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autopay_schedules TO authenticated;
GRANT ALL ON public.autopay_schedules TO service_role;
ALTER TABLE public.autopay_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own autopay schedules"
  ON public.autopay_schedules FOR ALL TO authenticated
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all autopay schedules"
  ON public.autopay_schedules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_autopay_schedules_updated_at
  BEFORE UPDATE ON public.autopay_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();