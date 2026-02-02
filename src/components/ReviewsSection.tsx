import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Quote } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Review {
  id: string;
  reviewer_name: string;
  location: string | null;
  rating: number;
  comment: string;
  earnings_amount: string | null;
  is_featured: boolean;
}

export function ReviewsSection() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('is_featured', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data as Review[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Success Stories from Kenya</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of Kenyans who are earning from home with our remote work accounts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews?.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl bg-card border border-border p-6 shadow-soft hover:shadow-glow transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-hero text-primary-foreground font-semibold">
                    {review.reviewer_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold">{review.reviewer_name}</h4>
                  <p className="text-sm text-muted-foreground">{review.location}</p>
                </div>
                <Quote className="h-8 w-8 text-primary/20" />
              </div>

              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-4">
                "{review.comment}"
              </p>

              {review.earnings_amount && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Earnings</p>
                  <p className="text-lg font-bold text-success">{review.earnings_amount}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
