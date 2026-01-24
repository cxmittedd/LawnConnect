-- Create a table to track if welcome email has been sent
CREATE TABLE IF NOT EXISTS public.welcome_email_sent (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.welcome_email_sent ENABLE ROW LEVEL SECURITY;

-- Users can only view their own record
CREATE POLICY "Users can view own welcome_email_sent record"
ON public.welcome_email_sent
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own record
CREATE POLICY "Users can insert own welcome_email_sent record"
ON public.welcome_email_sent
FOR INSERT
WITH CHECK (auth.uid() = user_id);