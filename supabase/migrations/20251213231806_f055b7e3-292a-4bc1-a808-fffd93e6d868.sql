-- Drop the existing check constraint
ALTER TABLE public.job_requests DROP CONSTRAINT job_requests_status_check;

-- Add updated check constraint with pending_completion status
ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_status_check 
CHECK (status = ANY (ARRAY['open'::text, 'in_negotiation'::text, 'accepted'::text, 'in_progress'::text, 'pending_completion'::text, 'completed'::text, 'cancelled'::text]));