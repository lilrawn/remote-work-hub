import { Link } from 'react-router-dom';
import { FileText, Headphones, Code, PenTool, ArrowRight } from 'lucide-react';
import type { Category } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Headphones,
  Code,
  PenTool,
};

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon ? iconMap[category.icon] || FileText : FileText;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Link to={`/jobs?category=${category.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-soft hover:shadow-card transition-all duration-300 border border-border hover:border-primary/20">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-hero mb-4 shadow-soft group-hover:shadow-glow transition-shadow">
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {category.description}
        </p>

        {/* Price Range */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {formatPrice(category.min_price)} - {formatPrice(category.max_price)}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
