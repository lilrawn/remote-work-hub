-- Create telegram support tickets table
CREATE TABLE public.telegram_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  admin_message_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_support_tickets ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage tickets
CREATE POLICY "Admins can view all tickets"
ON public.telegram_support_tickets
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can update tickets"
ON public.telegram_support_tickets
FOR UPDATE
USING (is_admin());

-- Allow service role to insert (from edge function)
CREATE POLICY "Service role can insert tickets"
ON public.telegram_support_tickets
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_telegram_tickets_status ON public.telegram_support_tickets(status);
CREATE INDEX idx_telegram_tickets_admin_message ON public.telegram_support_tickets(admin_message_id);

-- Add trigger for updated_at
CREATE TRIGGER update_telegram_tickets_updated_at
BEFORE UPDATE ON public.telegram_support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();