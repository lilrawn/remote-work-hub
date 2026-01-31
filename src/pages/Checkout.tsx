import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Phone, User, Mail, CreditCard, ShieldCheck } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const phoneNumber = formatPhoneNumber(formData.phone);
      const amount = getTotalPrice();

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          job_account_id: items[0].job.id, // For simplicity, linking to first item
          customer_name: formData.name,
          customer_phone: phoneNumber,
          customer_email: formData.email || null,
          amount: amount,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Initiate M-Pesa STK Push
      const { data: mpesaResponse, error: mpesaError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: phoneNumber,
          amount: amount,
          orderId: order.id,
          accountReference: `RWM-${order.id.slice(0, 8)}`,
          transactionDesc: `Payment for ${items.map(i => i.job.title).join(', ')}`,
        },
      });

      if (mpesaError) throw mpesaError;

      if (mpesaResponse.success) {
        toast.success('M-Pesa prompt sent! Check your phone to complete payment.');
        clearCart();
        navigate('/payment-pending', { 
          state: { 
            orderId: order.id,
            checkoutRequestId: mpesaResponse.checkoutRequestId 
          } 
        });
      } else {
        throw new Error(mpesaResponse.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="order-2 md:order-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl bg-card shadow-soft border border-border p-6 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Customer Details
                  </h2>

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">M-Pesa Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="0712345678"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your Safaricom M-Pesa number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </h2>
                  
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                      <span className="text-xl font-bold text-success">M</span>
                    </div>
                    <div>
                      <p className="font-semibold text-success">M-Pesa Lipa Na M-Pesa</p>
                      <p className="text-sm text-muted-foreground">
                        You will receive an STK push on your phone
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground h-12 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay {formatPrice(getTotalPrice())}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Secure payment powered by Safaricom M-Pesa</span>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="order-1 md:order-2">
              <div className="rounded-xl bg-card shadow-soft border border-border p-6 sticky top-24">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.job.id} className="flex justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.job.title}</p>
                        {item.job.company && (
                          <p className="text-xs text-muted-foreground">{item.job.company}</p>
                        )}
                      </div>
                      <span className="font-semibold">{formatPrice(item.job.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(getTotalPrice())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
