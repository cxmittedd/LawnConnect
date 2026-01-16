-- Add 'disputed' to the allowed status values for job_requests
ALTER TABLE job_requests DROP CONSTRAINT job_requests_status_check;

ALTER TABLE job_requests ADD CONSTRAINT job_requests_status_check 
CHECK (status = ANY (ARRAY['open'::text, 'in_negotiation'::text, 'accepted'::text, 'in_progress'::text, 'pending_completion'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text]));