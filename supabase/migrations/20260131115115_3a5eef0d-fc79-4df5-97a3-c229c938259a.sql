-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  min_price INTEGER NOT NULL DEFAULT 2000,
  max_price INTEGER NOT NULL DEFAULT 50000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_accounts table
CREATE TABLE public.job_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company TEXT,
  price INTEGER NOT NULL,
  monthly_earnings TEXT,
  skills_required TEXT[],
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_account_id UUID REFERENCES public.job_accounts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  amount INTEGER NOT NULL,
  mpesa_checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable"
ON public.categories FOR SELECT
USING (true);

-- Job accounts are publicly readable
CREATE POLICY "Job accounts are publicly readable"
ON public.job_accounts FOR SELECT
USING (true);

-- Orders can be inserted by anyone (for checkout)
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

-- Orders can be read by matching phone number
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_job_accounts_updated_at
BEFORE UPDATE ON public.job_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, description, icon, min_price, max_price) VALUES
('Data Entry & Virtual Assistant', 'Entry-level remote positions ideal for beginners', 'FileText', 2000, 10000),
('Customer Service & Support', 'Help customers and earn from home', 'Headphones', 10000, 25000),
('Tech & Development', 'High-paying tech roles for skilled professionals', 'Code', 25000, 50000),
('Content & Marketing', 'Creative roles in digital marketing', 'PenTool', 8000, 30000);

-- Insert sample job accounts
INSERT INTO public.job_accounts (category_id, title, description, company, price, monthly_earnings, skills_required, image_url) VALUES
((SELECT id FROM public.categories WHERE name = 'Data Entry & Virtual Assistant'), 'Amazon Data Entry Clerk', 'Process product listings and update inventory data for Amazon sellers', 'Amazon Seller Network', 3500, 'KSH 15,000 - 25,000', ARRAY['Basic Computer Skills', 'Fast Typing', 'Attention to Detail'], NULL),
((SELECT id FROM public.categories WHERE name = 'Data Entry & Virtual Assistant'), 'Virtual Admin Assistant', 'Handle emails, scheduling, and administrative tasks remotely', 'Remote Admin Hub', 5000, 'KSH 20,000 - 35,000', ARRAY['Microsoft Office', 'Communication', 'Time Management'], NULL),
((SELECT id FROM public.categories WHERE name = 'Customer Service & Support'), 'Shopify Customer Support', 'Respond to customer inquiries via chat and email', 'E-Commerce Solutions', 12000, 'KSH 35,000 - 50,000', ARRAY['English Fluency', 'Problem Solving', 'Patience'], NULL),
((SELECT id FROM public.categories WHERE name = 'Customer Service & Support'), 'Technical Support Agent', 'Provide tech support for software products', 'TechSupport Kenya', 18000, 'KSH 45,000 - 65,000', ARRAY['Technical Knowledge', 'Communication', 'Troubleshooting'], NULL),
((SELECT id FROM public.categories WHERE name = 'Tech & Development'), 'Web Developer Account', 'Build websites for international clients', 'Global Dev Network', 35000, 'KSH 80,000 - 150,000', ARRAY['HTML/CSS', 'JavaScript', 'React'], NULL),
((SELECT id FROM public.categories WHERE name = 'Tech & Development'), 'Python Developer Role', 'Develop automation scripts and data solutions', 'DataTech Solutions', 45000, 'KSH 100,000 - 200,000', ARRAY['Python', 'Data Analysis', 'API Integration'], NULL),
((SELECT id FROM public.categories WHERE name = 'Content & Marketing'), 'Social Media Manager', 'Manage social media accounts for brands', 'Digital Marketing Pro', 15000, 'KSH 40,000 - 70,000', ARRAY['Social Media', 'Content Creation', 'Analytics'], NULL),
((SELECT id FROM public.categories WHERE name = 'Content & Marketing'), 'Content Writer Account', 'Write articles and blog posts for clients', 'Content Hub Africa', 8000, 'KSH 25,000 - 45,000', ARRAY['Writing Skills', 'Research', 'SEO Basics'], NULL);