import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, CheckCircle2, Clock, Briefcase, CreditCard, AlertCircle } from 'lucide-react';

interface Purchase {
  id: string;
  job_account_id: string;
  start_date: string;
  end_date: string;
  status: string;
  job_accounts: {
    title: string;
    company: string | null;
    monthly_earnings: string | null;
  } | null;
}

interface TaskProgress {
  id: string;
  task_id: string;
  status: string;
  completed_at: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['user_purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*, job_accounts(title, company, monthly_earnings)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Purchase[];
    },
    enabled: !!user,
  });

  const { data: taskProgress } = useQuery({
    queryKey: ['task_progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_task_progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as TaskProgress[];
    },
    enabled: !!user,
  });

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getCurrentDay = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(30, Math.max(1, diff));
  };

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activePurchases = purchases?.filter(p => p.status === 'active') || [];
  const pendingRegistration = purchases?.filter(p => p.status === 'pending_registration') || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {profile?.full_name || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Track your progress and complete daily tasks to earn
            </p>
          </div>

          {/* Pending Registration Alert */}
          {pendingRegistration.length > 0 && (
            <div className="mb-8 rounded-xl bg-warning/10 border border-warning/20 p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning">Complete Your Registration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have {pendingRegistration.length} account(s) pending registration. Complete your profile and payment details to start earning.
                  </p>
                  <Link to="/complete-registration">
                    <Button className="bg-warning hover:bg-warning/90 text-warning-foreground">
                      Complete Registration
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Active Purchases */}
          {activePurchases.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Your Active Accounts
              </h2>

              <div className="grid gap-6">
                {activePurchases.map((purchase) => {
                  const daysRemaining = calculateDaysRemaining(purchase.end_date);
                  const progress = calculateProgress(purchase.start_date, purchase.end_date);
                  const currentDay = getCurrentDay(purchase.start_date);

                  return (
                    <div
                      key={purchase.id}
                      className="rounded-xl bg-card border border-border p-6 shadow-soft"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {purchase.job_accounts?.title}
                          </h3>
                          {purchase.job_accounts?.company && (
                            <p className="text-sm text-muted-foreground">
                              {purchase.job_accounts.company}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            Day {currentDay}/30
                          </Badge>
                          <Badge className="bg-success text-success-foreground gap-1">
                            <Clock className="h-3 w-3" />
                            {daysRemaining} days left
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <Link to={`/my-tasks/${purchase.id}`} className="flex-1">
                          <Button className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            View Today's Task
                          </Button>
                        </Link>
                        {purchase.job_accounts?.monthly_earnings && (
                          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
                            <CreditCard className="h-4 w-4 text-success" />
                            <span className="font-semibold text-success">
                              {purchase.job_accounts.monthly_earnings}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Active Accounts</h2>
              <p className="text-muted-foreground mb-6">
                Purchase a remote work account to start earning today!
              </p>
              <Link to="/jobs">
                <Button className="bg-gradient-hero hover:opacity-90 text-primary-foreground">
                  Browse Job Accounts
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
