-- Add read_at column to track when messages were read
ALTER TABLE public.messages ADD COLUMN read_at timestamp with time zone;

-- Create index for faster unread message queries
CREATE INDEX idx_messages_unread ON public.messages (job_id, sender_id, read_at) WHERE read_at IS NULL;