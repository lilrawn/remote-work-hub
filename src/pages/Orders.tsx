import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { orderLookupSchema, OrderLookupFormData, formatPhoneForMpesa } from '@/lib/validations';
import { toast } from 'sonner';
import { Loader2, Phone, Package, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  amount: number;
  payment_status: string;
  mpesa_receipt_number: string | null;
  created_at: string;
  job_account?: {
    title: string;
    company: string | null;
  } | null;
}

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const form = useForm<OrderLookupFormData>({
    resolver: zodResolver(orderLookupSchema),
    defaultValues: {
      phone: '',
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-primary text-primary-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const handleSearch = async (data: OrderLookupFormData) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const formattedPhone = formatPhoneForMpesa(data.phone);
      
      // Use the security definer function for phone lookup
      const { data: ordersData, error } = await supabase
        .rpc('get_orders_by_phone', { phone_input: formattedPhone });

      if (error) {
        throw error;
      }

      setOrders(ordersData || []);
      
      if (!ordersData || ordersData.length === 0) {
        toast.info('No orders found for this phone number');
      }
    } catch (err) {
      toast.error('Failed to fetch orders. Please try again.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated, fetch their orders automatically
  const fetchUserOrders = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*, job_account:job_accounts(title, company)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(ordersData || []);
    } catch (err) {
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">Order History</h1>
          <p className="text-muted-foreground mb-8">
            {user 
              ? 'View your order history and payment status'
              : 'Enter your phone number to view your orders'
            }
          </p>

          {/* Search Form for non-authenticated users */}
          {!user && (
            <div className="rounded-xl bg-card shadow-soft border border-border p-6 mb-8">
              <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="0712345678"
                        className="pl-10"
                        {...form.register('phone')}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-hero hover:opacity-90 text-primary-foreground"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </form>
              
              <p className="text-sm text-muted-foreground mt-4">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
                {' '}to automatically see all your orders
              </p>
            </div>
          )}

          {/* Load orders button for authenticated users */}
          {user && !hasSearched && (
            <Button
              onClick={fetchUserOrders}
              disabled={isLoading}
              className="mb-8 bg-gradient-hero hover:opacity-90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Load My Orders
                </>
              )}
            </Button>
          )}

          {/* Orders List */}
          {hasSearched && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No orders found</h2>
                  <p className="text-muted-foreground mb-4">
                    You haven't placed any orders yet
                  </p>
                  <Link to="/jobs">
                    <Button className="bg-gradient-hero hover:opacity-90 text-primary-foreground">
                      Browse Job Accounts
                    </Button>
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl bg-card shadow-soft border border-border p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      {getStatusBadge(order.payment_status)}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-bold text-primary">{formatPrice(order.amount)}</p>
                      </div>
                    </div>

                    {order.mpesa_receipt_number && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">M-Pesa Receipt</p>
                        <p className="font-mono text-sm">{order.mpesa_receipt_number}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
