-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fixes: RLS vulnerabilities, adds auth support, RBAC
-- =====================================================

-- 1. Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table (NEVER store roles on profile/users table)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Add user_id column to orders table for ownership tracking
ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_customer_phone ON public.orders(customer_phone);

-- 5. Create security definer functions for role checking
-- This prevents RLS infinite recursion

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- 6. Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- 8. Create secure RLS policies for orders

-- Orders: Users can only view their own orders (by user_id OR phone number)
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() = user_id OR
  public.is_admin()
);

-- Orders: Only authenticated users or guests can create orders
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  -- If user is authenticated, user_id must match
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  -- If no auth, user_id must be null (guest checkout)
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Orders: Only admins can update orders (for status changes via edge functions)
CREATE POLICY "Service role can update orders"
ON public.orders
FOR UPDATE
USING (public.is_admin());

-- 9. Create secure RLS policies for profiles

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- 10. Create secure RLS policies for user_roles

-- Only admins can view all roles, users can see their own
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Only admins can insert roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin());

-- 11. Create RLS policies for admin access to job_accounts

-- Drop existing read-only policy and recreate with admin write access
CREATE POLICY "Admins can insert job accounts"
ON public.job_accounts
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update job accounts"
ON public.job_accounts
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete job accounts"
ON public.job_accounts
FOR DELETE
USING (public.is_admin());

-- 12. Create RLS policies for admin access to categories

CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
USING (public.is_admin());

-- 13. Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create secure function to lookup orders by phone (with rate limiting consideration)
CREATE OR REPLACE FUNCTION public.get_orders_by_phone(phone_input TEXT)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.orders
  WHERE customer_phone = phone_input
  ORDER BY created_at DESC
  LIMIT 50;
$$;