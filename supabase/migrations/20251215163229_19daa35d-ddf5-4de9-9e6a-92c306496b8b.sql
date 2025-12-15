-- Drop the unique constraint on customer_id to allow multiple autopay configs per customer
ALTER TABLE public.autopay_settings DROP CONSTRAINT IF EXISTS autopay_settings_customer_id_key;

-- Add new columns for frequency and second cut day
ALTER TABLE public.autopay_settings 
ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'bimonthly')),
ADD COLUMN IF NOT EXISTS recurring_day_2 INTEGER CHECK (recurring_day_2 >= 1 AND recurring_day_2 <= 28),
ADD COLUMN IF NOT EXISTS next_scheduled_date_2 DATE,
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_autopay_customer_enabled ON public.autopay_settings(customer_id, enabled);