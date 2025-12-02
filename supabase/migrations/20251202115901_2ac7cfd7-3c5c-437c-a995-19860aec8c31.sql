-- Drop existing tables that don't fit the new model
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;

-- Update profiles table to include user role
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_role TEXT NOT NULL DEFAULT 'customer' CHECK (user_role IN ('customer', 'provider', 'both')),
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create job requests table
CREATE TABLE public.job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  lawn_size TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  additional_requirements TEXT,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 7000.00 CHECK (base_price >= 7000),
  customer_offer DECIMAL(10, 2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_negotiation', 'accepted', 'in_progress', 'completed', 'cancelled')),
  accepted_provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  final_price DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'released', 'refunded')),
  platform_fee DECIMAL(10, 2),
  provider_payout DECIMAL(10, 2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job proposals/bids table
CREATE TABLE public.job_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_price DECIMAL(10, 2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, provider_id)
);

-- Create job photos table
CREATE TABLE public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, reviewer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_requests
CREATE POLICY "Customers can create job requests"
  ON public.job_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own job requests"
  ON public.job_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Providers can view open job requests"
  ON public.job_requests FOR SELECT
  USING (status IN ('open', 'in_negotiation') OR auth.uid() = accepted_provider_id);

CREATE POLICY "Customers can update their own job requests"
  ON public.job_requests FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Providers can update accepted jobs"
  ON public.job_requests FOR UPDATE
  USING (auth.uid() = accepted_provider_id);

CREATE POLICY "Customers can delete their own open job requests"
  ON public.job_requests FOR DELETE
  USING (auth.uid() = customer_id AND status = 'open');

-- RLS Policies for job_proposals
CREATE POLICY "Providers can create proposals"
  ON public.job_proposals FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can view their own proposals"
  ON public.job_proposals FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Customers can view proposals for their jobs"
  ON public.job_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = job_proposals.job_id
      AND job_requests.customer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their own proposals"
  ON public.job_proposals FOR UPDATE
  USING (auth.uid() = provider_id);

CREATE POLICY "Customers can update proposal status"
  ON public.job_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = job_proposals.job_id
      AND job_requests.customer_id = auth.uid()
    )
  );

-- RLS Policies for job_photos
CREATE POLICY "Users can view job photos"
  ON public.job_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = job_photos.job_id
      AND (job_requests.customer_id = auth.uid() OR job_requests.accepted_provider_id = auth.uid() OR job_requests.status IN ('open', 'in_negotiation'))
    )
  );

CREATE POLICY "Customers can manage their job photos"
  ON public.job_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = job_photos.job_id
      AND job_requests.customer_id = auth.uid()
    )
  );

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews for jobs they're involved in"
  ON public.reviews FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

CREATE POLICY "Users can view public reviews of providers"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = reviews.reviewee_id
      AND profiles.user_role IN ('provider', 'both')
    )
  );

CREATE POLICY "Users can create reviews for completed jobs"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = reviews.job_id
      AND job_requests.status = 'completed'
      AND (job_requests.customer_id = auth.uid() OR job_requests.accepted_provider_id = auth.uid())
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER set_job_requests_updated_at
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_job_proposals_updated_at
  BEFORE UPDATE ON public.job_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update profiles trigger to include user_role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'customer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();