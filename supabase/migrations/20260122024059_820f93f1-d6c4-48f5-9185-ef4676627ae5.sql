-- Create signup analytics table to track user registrations by role
CREATE TABLE public.signup_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_role text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_analytics ENABLE ROW LEVEL SECURITY;

-- Only admins can view signup analytics
CREATE POLICY "Admins can view signup analytics"
ON public.signup_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from authenticated users (for their own signup)
CREATE POLICY "Users can insert their own signup record"
ON public.signup_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster role-based queries
CREATE INDEX idx_signup_analytics_user_role ON public.signup_analytics(user_role);
CREATE INDEX idx_signup_analytics_created_at ON public.signup_analytics(created_at);