-- Create customer_preferences table to store saved job posting info
CREATE TABLE public.customer_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL UNIQUE,
  location TEXT,
  parish TEXT,
  lawn_size TEXT,
  job_type TEXT,
  additional_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own preferences"
ON public.customer_preferences FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert their own preferences"
ON public.customer_preferences FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own preferences"
ON public.customer_preferences FOR UPDATE
USING (auth.uid() = customer_id);

-- Create autopay_settings table
CREATE TABLE public.autopay_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  recurring_day INTEGER NOT NULL CHECK (recurring_day >= 1 AND recurring_day <= 28),
  card_last_four TEXT,
  card_name TEXT,
  next_scheduled_date DATE,
  location TEXT,
  parish TEXT,
  lawn_size TEXT,
  job_type TEXT,
  additional_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.autopay_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own autopay settings"
ON public.autopay_settings FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert their own autopay settings"
ON public.autopay_settings FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own autopay settings"
ON public.autopay_settings FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own autopay settings"
ON public.autopay_settings FOR DELETE
USING (auth.uid() = customer_id);

-- Triggers for updated_at
CREATE TRIGGER update_customer_preferences_updated_at
BEFORE UPDATE ON public.customer_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_autopay_settings_updated_at
BEFORE UPDATE ON public.autopay_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();