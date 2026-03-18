import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { checkoutSchema, CheckoutFormData, formatPhoneForMpesa } from '@/lib/validations';
import { toast } from 'sonner';
import { Loader2, Phone, User, Mail, CreditCard, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = 'mpesa' | 'paystack';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);

  const handleMpesaPayment = async (data: CheckoutFormData, order: any) => {
    const phoneNumber = formatPhoneForMpesa(data.phone);
    const amount = getTotalPrice();

    const { data: mpesaResponse, error: mpesaError } = await supabase.functions.invoke('mpesa-stk-push', {
      body: {
        phone: phoneNumber,
        amount,
        orderId: order.id,
        accountReference: `RWM-${order.id.slice(0, 8)}`,
        transactionDesc: `Payment for ${items.map((i) => i.job.title).join(', ')}`,
      },
    });

    if (mpesaError) throw mpesaError;

    if (mpesaResponse.success) {
      toast.success('M-Pesa prompt sent! Check your phone to complete payment.');
      clearCart();
      navigate('/payment-pending', {
        state: { orderId: order.id, checkoutRequestId: mpesaResponse.checkoutRequestId },
      });
    } else {
      throw new Error(mpesaResponse.error || 'Payment initiation failed');
    }
  };

  const handlePaystackPayment = async (data: CheckoutFormData, order: any) => {
    const email = data.email || `${data.phone.replace(/\D/g, '')}@placeholder.rw`;
    const amount = getTotalPrice() * 100; // Paystack uses smallest currency unit

    const { data: psResponse, error: psError } = await supabase.functions.invoke('paystack-initialize', {
      body: {
        email,
        amount,
        orderId: order.id,
        jobAccountId: items[0]?.job.id,
        metadata: { customer_name: data.name, phone: data.phone },
      },
    });

    if (psError) throw psError;

    if (psResponse.success && psResponse.authorization_url) {
      clearCart();
      window.location.href = psResponse.authorization_url;
    } else {
      throw new Error(psResponse.error || 'Payment initiation failed');
    }
  };

  const handleSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsLoading(true);

    try {
      const phoneNumber = formatPhoneForMpesa(data.phone);
      const amount = getTotalPrice();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          job_account_id: items[0].job.id,
          customer_name: data.name,
          customer_phone: phoneNumber,
          customer_email: data.email || null,
          amount,
          payment_status: 'pending',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (paymentMethod === 'mpesa') {
        await handleMpesaPayment(data, order);
      } else {
        await handlePaystackPayment(data, order);
      }
    } catch (error: any) {
      toast.error('Failed to process payment. Please try again.');
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
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="rounded-xl bg-card shadow-soft border border-border p-6 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Customer Details
                  </h2>

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="John Doe" autoComplete="name" {...form.register('name')} />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="0712345678"
                        className="pl-10"
                        autoComplete="tel"
                        {...form.register('phone')}
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email {paymentMethod === 'paystack' ? '*' : '(Optional)'}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        className="pl-10"
                        autoComplete="email"
                        {...form.register('email')}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </h2>

                  <div className="space-y-3">
                    {/* M-Pesa Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mpesa')}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                        paymentMethod === 'mpesa'
                          ? 'border-success bg-success/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/20 shrink-0">
                        <span className="text-xl font-bold text-success">M</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">M-Pesa</p>
                        <p className="text-sm text-muted-foreground">STK push to your Safaricom number</p>
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                          paymentMethod === 'mpesa' ? 'border-success' : 'border-muted-foreground/40'
                        )}
                      >
                        {paymentMethod === 'mpesa' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-success" />
                        )}
                      </div>
                    </button>

                    {/* Paystack Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paystack')}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                        paymentMethod === 'paystack'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 shrink-0">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Card / Mobile Money</p>
                        <p className="text-sm text-muted-foreground">Pay via Paystack (cards, M-Pesa, etc.)</p>
                      </div>
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                          paymentMethod === 'paystack' ? 'border-primary' : 'border-muted-foreground/40'
                        )}
                      >
                        {paymentMethod === 'paystack' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
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
                    <>Pay {formatPrice(getTotalPrice())}</>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>
                    {paymentMethod === 'mpesa'
                      ? 'Secure payment powered by Safaricom M-Pesa'
                      : 'Secure payment powered by Paystack'}
                  </span>
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
                    <span className="text-2xl font-bold text-primary">{formatPrice(getTotalPrice())}</span>
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
