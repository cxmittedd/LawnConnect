-- Fix 1: Update profiles RLS to add time-based access restriction (30 days after job completion)
-- Drop the existing policy that allows indefinite access
DROP POLICY IF EXISTS "Users can view authorized profiles" ON public.profiles;

-- Create new policy with time-based restriction
-- Users can view profiles only if:
-- 1. It's their own profile
-- 2. They are involved in a job that is accepted/in_progress/pending_completion
-- 3. They are involved in a completed job that was completed within the last 30 days
CREATE POLICY "Users can view authorized profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) 
  OR (
    EXISTS (
      SELECT 1 FROM job_requests
      WHERE (
        ((job_requests.customer_id = profiles.id) AND (job_requests.accepted_provider_id = auth.uid())) 
        OR ((job_requests.accepted_provider_id = profiles.id) AND (job_requests.customer_id = auth.uid()))
      )
      AND (
        -- Active jobs: accepted, in_progress, pending_completion
        (job_requests.status = ANY (ARRAY['accepted'::text, 'in_progress'::text, 'pending_completion'::text]))
        OR 
        -- Completed jobs: only within 30 days of completion
        (job_requests.status = 'completed'::text AND job_requests.completed_at > (now() - interval '30 days'))
      )
    )
  )
);

-- Fix 2: Create audit logging table for sensitive data access (banking details)
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'view',
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit logs
ALTER TABLE public.sensitive_data_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view sensitive data access logs"
ON public.sensitive_data_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit logs (when they access data)
CREATE POLICY "Admins can insert sensitive data access logs"
ON public.sensitive_data_access_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

-- Create index for efficient querying
CREATE INDEX idx_sensitive_access_logs_admin ON public.sensitive_data_access_logs(admin_id);
CREATE INDEX idx_sensitive_access_logs_table ON public.sensitive_data_access_logs(table_name);
CREATE INDEX idx_sensitive_access_logs_time ON public.sensitive_data_access_logs(accessed_at DESC);