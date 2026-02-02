import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, AlertTriangle } from 'lucide-react';

interface StockBadgeProps {
  totalStock: number;
  soldCount: number;
  showDetails?: boolean;
}

export function StockBadge({ totalStock, soldCount, showDetails = false }: StockBadgeProps) {
  const remaining = totalStock - soldCount;
  const percentSold = Math.round((soldCount / totalStock) * 100);
  
  const isLowStock = remaining <= 10;
  const isOutOfStock = remaining <= 0;

  if (isOutOfStock) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Sold Out
      </Badge>
    );
  }

  if (showDetails) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            {remaining} accounts left
          </span>
          <span className="text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {soldCount} sold
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-gradient-hero rounded-full h-2 transition-all duration-500"
            style={{ width: `${percentSold}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <Badge
      variant={isLowStock ? 'destructive' : 'secondary'}
      className="gap-1"
    >
      <Package className="h-3 w-3" />
      {remaining} left
      {isLowStock && ' - Hurry!'}
    </Badge>
  );
}
