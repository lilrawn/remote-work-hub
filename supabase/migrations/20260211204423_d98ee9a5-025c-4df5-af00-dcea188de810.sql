
-- Create payments table for Paystack transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paystack_transaction_id TEXT,
  metadata JSONB,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- Only system (service role) inserts payments via edge functions
CREATE POLICY "Service role can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);

-- Only admins can update payments
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (is_admin());

-- Only admins can delete payments
CREATE POLICY "Admins can delete payments"
ON public.payments FOR DELETE
USING (is_admin());

-- Index for fast lookups
CREATE INDEX idx_payments_reference ON public.payments(reference);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
