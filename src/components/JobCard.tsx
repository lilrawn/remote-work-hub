import { ShoppingCart, Check, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockBadge } from '@/components/StockBadge';
import { useCart } from '@/hooks/useCart';
import type { JobAccount } from '@/types';
import { toast } from 'sonner';

interface JobCardProps {
  job: JobAccount & { total_stock?: number; sold_count?: number };
}

export function JobCard({ job }: JobCardProps) {
  const { items, addItem, removeItem } = useCart();
  const isInCart = items.some(item => item.job.id === job.id);
  const totalStock = job.total_stock || 100;
  const soldCount = job.sold_count || 0;
  const remaining = totalStock - soldCount;
  const isOutOfStock = remaining <= 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleCartAction = () => {
    if (isOutOfStock) {
      toast.error('This account is sold out');
      return;
    }
    if (isInCart) {
      removeItem(job.id);
      toast.success('Removed from cart');
    } else {
      addItem(job);
      toast.success('Added to cart');
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card shadow-soft hover:shadow-card transition-all duration-300 border border-border hover:border-primary/20">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-card">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        {job.monthly_earnings && (
          <Badge className="absolute top-3 right-3 bg-success text-success-foreground border-0">
            <TrendingUp className="h-3 w-3 mr-1" />
            {job.monthly_earnings}
          </Badge>
        )}
        <div className="absolute top-3 left-3">
          <StockBadge totalStock={totalStock} soldCount={soldCount} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {job.company && (
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {job.company}
          </span>
        )}
        
        <h3 className="text-lg font-semibold text-foreground mt-1 mb-2 line-clamp-1">
          {job.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        {job.skills_required && job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills_required.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {/* Stock Progress */}
        <div className="mb-4">
          <StockBadge totalStock={totalStock} soldCount={soldCount} showDetails />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <span className="text-xs text-muted-foreground">Price</span>
            <p className="text-xl font-bold text-primary">{formatPrice(job.price)}</p>
          </div>
          
          <Button 
            onClick={handleCartAction}
            variant={isInCart ? "secondary" : "default"}
            disabled={isOutOfStock}
            className={isInCart ? "" : "bg-gradient-hero hover:opacity-90 text-primary-foreground"}
          >
            {isOutOfStock ? (
              'Sold Out'
            ) : isInCart ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                In Cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
