-- =====================================================
-- COMPLETE PLATFORM UPGRADE: Registration, Tasks, Reviews, Support
-- =====================================================

-- 1. Add stock tracking to job_accounts
ALTER TABLE public.job_accounts ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 100;
ALTER TABLE public.job_accounts ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

-- 2. Create user_purchases table to track purchased accounts
CREATE TABLE public.user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_account_id UUID REFERENCES public.job_accounts(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending_registration', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
ON public.user_purchases FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "System can create purchases"
ON public.user_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update purchases"
ON public.user_purchases FOR UPDATE
USING (public.is_admin() OR auth.uid() = user_id);

-- 3. Create user_payment_methods table
CREATE TABLE public.user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    method_type TEXT NOT NULL CHECK (method_type IN ('mpesa', 'bank')),
    -- M-Pesa fields
    mpesa_phone TEXT,
    mpesa_name TEXT,
    -- Bank fields
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    branch_code TEXT,
    -- Common
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their payment methods"
ON public.user_payment_methods FOR ALL
USING (auth.uid() = user_id);

-- 4. Create daily_tasks table
CREATE TABLE public.daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_account_id UUID REFERENCES public.job_accounts(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_time TEXT,
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (job_account_id, day_number)
);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks are publicly readable"
ON public.daily_tasks FOR SELECT USING (true);

CREATE POLICY "Admins can manage tasks"
ON public.daily_tasks FOR ALL
USING (public.is_admin());

-- 5. Create user_task_progress table
CREATE TABLE public.user_task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    purchase_id UUID REFERENCES public.user_purchases(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.daily_tasks(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    submission_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, purchase_id, task_id)
);

ALTER TABLE public.user_task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
ON public.user_task_progress FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own progress"
ON public.user_task_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can mark tasks complete"
ON public.user_task_progress FOR UPDATE
USING (auth.uid() = user_id);

-- 6. Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_name TEXT NOT NULL,
    location TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    earnings_amount TEXT,
    avatar_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Admins can manage reviews"
ON public.reviews FOR ALL
USING (public.is_admin());

-- 7. Create support_messages table (private chat)
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_from_admin BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.support_messages FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can send messages"
ON public.support_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_from_admin = false);

CREATE POLICY "Admins can reply to messages"
ON public.support_messages FOR INSERT
WITH CHECK (public.is_admin() AND is_from_admin = true);

CREATE POLICY "Admins can mark messages as read"
ON public.support_messages FOR UPDATE
USING (public.is_admin());

-- 8. Add profile fields for user registration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_registration_complete BOOLEAN DEFAULT false;

-- 9. Insert sample Kenyan reviews
INSERT INTO public.reviews (reviewer_name, location, rating, comment, earnings_amount, is_featured) VALUES
('Wanjiku Muthoni', 'Nairobi', 5, 'This platform changed my life! I earned KSH 45,000 in my first month working from home. The daily tasks are simple and the support team is amazing!', 'KSH 45,000', true),
('Brian Ochieng', 'Kisumu', 5, 'I was skeptical at first but now I''m a believer. Made KSH 32,000 doing simple online tasks. Highly recommended for anyone looking for extra income!', 'KSH 32,000', true),
('Grace Njeri', 'Mombasa', 5, 'As a single mother, this platform has been a blessing. I can work from home and still take care of my children. Earned KSH 38,000 last month!', 'KSH 38,000', true),
('Kevin Kipchoge', 'Eldoret', 4, 'Great platform! The tasks are straightforward and payments are always on time. I''ve recommended it to all my friends.', 'KSH 28,000', false),
('Mary Akinyi', 'Nakuru', 5, 'I never thought making money online could be this easy. The 30-day program is well structured and the earnings are real!', 'KSH 41,000', true),
('Peter Kamau', 'Thika', 5, 'Started with skepticism, ended with a smile! Made KSH 35,000 in my first cycle. Already on my second account!', 'KSH 35,000', false),
('Faith Wambui', 'Kiambu', 5, 'The customer support is excellent! They respond quickly and the daily tasks are very manageable even with a full-time job.', 'KSH 29,000', false),
('James Mutua', 'Machakos', 4, 'Legit platform with real earnings. I work 2-3 hours daily and earn a decent side income. Worth every shilling!', 'KSH 33,000', false);

-- 10. Update job accounts with stock info
UPDATE public.job_accounts SET total_stock = 100, sold_count = 23 WHERE title LIKE '%Data Entry%';
UPDATE public.job_accounts SET total_stock = 75, sold_count = 18 WHERE title LIKE '%Survey%';
UPDATE public.job_accounts SET total_stock = 50, sold_count = 31 WHERE title LIKE '%Social Media%';
UPDATE public.job_accounts SET total_stock = 80, sold_count = 12 WHERE title LIKE '%Virtual Assistant%';
UPDATE public.job_accounts SET total_stock = 60, sold_count = 8 WHERE title LIKE '%Customer%';

-- 11. Create triggers for updated_at
CREATE TRIGGER update_user_purchases_updated_at
BEFORE UPDATE ON public.user_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_payment_methods_updated_at
BEFORE UPDATE ON public.user_payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();