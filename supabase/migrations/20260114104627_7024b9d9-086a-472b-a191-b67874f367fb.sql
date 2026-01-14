-- Create proxy_sessions table to track Twilio proxy number assignments per job
CREATE TABLE public.proxy_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  twilio_proxy_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'closed')),
  UNIQUE(job_id)
);

-- Enable RLS
ALTER TABLE public.proxy_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view proxy sessions for their own jobs
CREATE POLICY "Users can view their own proxy sessions"
  ON public.proxy_sessions
  FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- RLS: Only system (via service role) can insert/update proxy sessions
-- No INSERT/UPDATE policies for regular users - handled via edge functions

-- Add index for faster lookups
CREATE INDEX idx_proxy_sessions_job_id ON public.proxy_sessions(job_id);
CREATE INDEX idx_proxy_sessions_participants ON public.proxy_sessions(customer_id, provider_id);

-- Enable realtime for proxy sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.proxy_sessions;