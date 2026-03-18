import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setPaymentDetails(data);
          clearCart();
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [reference]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container max-w-md text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Verifying Payment...</h1>
              <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 mx-auto">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Your payment of {paymentDetails && formatPrice(paymentDetails.amount)} has been confirmed.
              </p>
              {paymentDetails?.reference && (
                <p className="text-sm text-muted-foreground">
                  Reference: <span className="font-mono font-medium">{paymentDetails.reference}</span>
                </p>
              )}
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate('/orders')}>
                  View Orders
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Payment Failed</h1>
              <p className="text-muted-foreground">
                We couldn't verify your payment. If money was deducted, it will be refunded automatically.
              </p>
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={() => navigate('/checkout')} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
