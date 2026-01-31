import { useLocation, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Home } from 'lucide-react';

const PaymentPending = () => {
  const location = useLocation();
  const { orderId } = location.state || {};

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container max-w-lg text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mx-auto mb-8 animate-pulse-slow">
            <Clock className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Payment Pending</h1>
          
          <p className="text-muted-foreground mb-8">
            We've sent an M-Pesa payment request to your phone. 
            Please enter your M-Pesa PIN to complete the transaction.
          </p>

          <div className="rounded-xl bg-card shadow-soft border border-border p-6 mb-8">
            <h2 className="font-semibold mb-4">What happens next?</h2>
            <ul className="text-left space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Check your phone for the M-Pesa STK push prompt
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Enter your M-Pesa PIN to authorize the payment
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  You'll receive a confirmation SMS once payment is complete
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Your job account details will be sent to you via SMS/Email
                </span>
              </li>
            </ul>
          </div>

          {orderId && (
            <p className="text-sm text-muted-foreground mb-6">
              Order ID: <span className="font-mono">{orderId}</span>
            </p>
          )}

          <Link to="/">
            <Button className="bg-gradient-hero hover:opacity-90 text-primary-foreground">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentPending;
