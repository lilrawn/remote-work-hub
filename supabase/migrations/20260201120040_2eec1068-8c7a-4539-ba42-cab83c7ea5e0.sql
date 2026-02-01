-- Add explicit DELETE policies for defense in depth
-- This is a security hardening measure

-- Prevent users from deleting their own profiles (only admin can)
CREATE POLICY "Users cannot delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_admin());

-- Only admins can delete orders (preserves transaction records)
CREATE POLICY "Only admins can delete orders"
ON public.orders
FOR DELETE
USING (public.is_admin());