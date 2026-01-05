-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Customers can create refund requests for their jobs
CREATE POLICY "Customers can create refund requests"
ON public.refund_requests
FOR INSERT
WITH CHECK (
  auth.uid() = customer_id 
  AND EXISTS (
    SELECT 1 FROM job_requests 
    WHERE id = job_id AND customer_id = auth.uid()
  )
);

-- Customers can view their own refund requests
CREATE POLICY "Customers can view their own refund requests"
ON public.refund_requests
FOR SELECT
USING (auth.uid() = customer_id);

-- Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update refund requests
CREATE POLICY "Admins can update refund requests"
ON public.refund_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();