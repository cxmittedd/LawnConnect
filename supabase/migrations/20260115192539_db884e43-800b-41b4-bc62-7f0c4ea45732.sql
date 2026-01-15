-- Create dispute messages table for admin-customer communication
CREATE TABLE public.dispute_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.job_disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'customer')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Admin can view and send messages on all disputes
CREATE POLICY "Admins can view all dispute messages"
  ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert dispute messages"
  ON public.dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND sender_type = 'admin');

-- Customers can view and send messages on their own disputes
CREATE POLICY "Customers can view their dispute messages"
  ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_disputes
      WHERE job_disputes.id = dispute_messages.dispute_id
      AND job_disputes.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert their dispute messages"
  ON public.dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'customer' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.job_disputes
      WHERE job_disputes.id = dispute_messages.dispute_id
      AND job_disputes.customer_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id);
CREATE INDEX idx_dispute_messages_created_at ON public.dispute_messages(created_at);