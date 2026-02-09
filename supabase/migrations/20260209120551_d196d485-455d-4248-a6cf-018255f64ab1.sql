ALTER TABLE public.job_requests DROP CONSTRAINT IF EXISTS job_requests_base_price_check;
ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_base_price_check CHECK (base_price >= 5000);
ALTER TABLE public.job_requests ALTER COLUMN base_price SET DEFAULT 5000.00;