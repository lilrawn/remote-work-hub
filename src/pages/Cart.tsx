import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { Badge } from '@/components/ui/badge';

const Cart = () => {
  const { items, removeItem, clearCart, getTotalPrice } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Browse our job accounts and add them to your cart
              </p>
              <Link to="/jobs">
                <Button className="bg-gradient-hero hover:opacity-90 text-primary-foreground">
                  Browse Jobs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.job.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft border border-border"
                  >
                    <div className="flex-1">
                      {item.job.company && (
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          {item.job.company}
                        </span>
                      )}
                      <h3 className="font-semibold">{item.job.title}</h3>
                      {item.job.monthly_earnings && (
                        <Badge variant="secondary" className="mt-2">
                          Earns: {item.job.monthly_earnings}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(item.job.price)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.job.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                  <span className="font-semibold">{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatPrice(getTotalPrice())}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="sm:flex-1"
                  >
                    Clear Cart
                  </Button>
                  <Link to="/checkout" className="sm:flex-1">
                    <Button className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground">
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
