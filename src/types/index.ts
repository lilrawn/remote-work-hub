export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  min_price: number;
  max_price: number;
  created_at: string;
}

export interface JobAccount {
  id: string;
  category_id: string | null;
  title: string;
  description: string;
  company: string | null;
  price: number;
  monthly_earnings: string | null;
  skills_required: string[] | null;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Order {
  id: string;
  job_account_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  amount: number;
  mpesa_checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  job: JobAccount;
  quantity: number;
}
