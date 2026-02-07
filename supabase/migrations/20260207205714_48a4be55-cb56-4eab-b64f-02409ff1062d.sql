-- Add user_id column to telegram_support_tickets for web users
ALTER TABLE public.telegram_support_tickets 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_support_tickets_user_id 
ON public.telegram_support_tickets(user_id);

-- Add RLS policy for users to view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.telegram_support_tickets
FOR SELECT
USING (auth.uid() = user_id OR is_admin());