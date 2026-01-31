import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  const stats = [
    { icon: Users, value: '5,000+', label: 'Active Accounts' },
    { icon: TrendingUp, value: 'KSH 50K+', label: 'Monthly Earnings' },
    { icon: CheckCircle2, value: '98%', label: 'Success Rate' },
  ];

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-8 animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            New remote opportunities added daily
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Start Earning from{' '}
            <span className="text-gradient">Remote Work</span>{' '}
            Today
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Purchase verified remote work accounts and start earning from KSH 15,000 to KSH 200,000 monthly. 
            Instant delivery, M-Pesa payment, full support.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/jobs">
              <Button size="lg" className="bg-gradient-hero hover:opacity-90 text-primary-foreground shadow-elevated hover:shadow-glow transition-all duration-300 px-8">
                Browse Job Accounts
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button variant="outline" size="lg" className="px-8">
                View Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center p-6 rounded-2xl bg-card shadow-soft hover:shadow-card transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
