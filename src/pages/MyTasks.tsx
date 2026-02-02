import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  Lock,
  ChevronRight,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  day_number: number;
  title: string;
  description: string;
  estimated_time: string | null;
  points: number;
}

interface TaskProgress {
  id: string;
  task_id: string;
  status: string;
  completed_at: string | null;
  submission_notes: string | null;
}

interface Purchase {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  job_account_id: string;
  job_accounts: {
    title: string;
    company: string | null;
  } | null;
}

const MyTasks = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data: purchase, isLoading: purchaseLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*, job_accounts(title, company)')
        .eq('id', purchaseId)
        .single();
      
      if (error) throw error;
      return data as Purchase;
    },
    enabled: !!purchaseId && !!user,
  });

  const { data: tasks } = useQuery({
    queryKey: ['daily_tasks', purchase?.job_account_id],
    queryFn: async () => {
      if (!purchase?.job_account_id) return [];
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('job_account_id', purchase.job_account_id)
        .order('day_number', { ascending: true });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!purchase?.job_account_id,
  });

  const { data: progress } = useQuery({
    queryKey: ['task_progress', purchaseId],
    queryFn: async () => {
      if (!purchaseId || !user) return [];
      const { data, error } = await supabase
        .from('user_task_progress')
        .select('*')
        .eq('purchase_id', purchaseId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as TaskProgress[];
    },
    enabled: !!purchaseId && !!user,
  });

  const completeTask = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes: string }) => {
      if (!user || !purchaseId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_task_progress')
        .upsert({
          user_id: user.id,
          purchase_id: purchaseId,
          task_id: taskId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          submission_notes: notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task completed! Great work!');
      queryClient.invalidateQueries({ queryKey: ['task_progress'] });
      setSubmissionNotes('');
      setSelectedDay(null);
    },
    onError: () => {
      toast.error('Failed to complete task');
    },
  });

  const getCurrentDay = () => {
    if (!purchase?.start_date) return 1;
    const start = new Date(purchase.start_date);
    const now = new Date();
    const diff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(30, Math.max(1, diff));
  };

  const currentDay = getCurrentDay();
  const selectedTask = tasks?.find(t => t.day_number === selectedDay);
  const selectedProgress = progress?.find(p => p.task_id === selectedTask?.id);

  const getTaskStatus = (dayNumber: number): 'locked' | 'available' | 'completed' => {
    const task = tasks?.find(t => t.day_number === dayNumber);
    if (!task) return 'locked';
    
    const taskProgress = progress?.find(p => p.task_id === task.id);
    if (taskProgress?.status === 'completed') return 'completed';
    if (dayNumber <= currentDay) return 'available';
    return 'locked';
  };

  if (authLoading || purchaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Purchase not found</p>
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const completedTasks = progress?.filter(p => p.status === 'completed').length || 0;
  const totalPoints = completedTasks * 10;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{purchase.job_accounts?.title}</h1>
            <p className="text-muted-foreground">
              Complete your daily tasks to maximize earnings
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">Day {currentDay}</p>
              <p className="text-sm text-muted-foreground">of 30</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Points</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Day List */}
            <div className="md:col-span-1">
              <h2 className="font-semibold mb-4">30-Day Program</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                  const status = getTaskStatus(day);
                  const task = tasks?.find(t => t.day_number === day);
                  
                  return (
                    <button
                      key={day}
                      onClick={() => status !== 'locked' && setSelectedDay(day)}
                      disabled={status === 'locked'}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                        selectedDay === day && "border-primary bg-primary/5",
                        status === 'locked' && "opacity-50 cursor-not-allowed",
                        status === 'completed' && "border-success/50 bg-success/5",
                        status === 'available' && day === currentDay && "border-primary bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                          status === 'completed' && "bg-success text-success-foreground",
                          status === 'available' && "bg-primary/20 text-primary",
                          status === 'locked' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : status === 'locked' ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          day
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          Day {day}
                          {day === currentDay && status === 'available' && (
                            <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task?.title || 'Task locked'}
                        </p>
                      </div>
                      {status !== 'locked' && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task Details */}
            <div className="md:col-span-2">
              {selectedTask ? (
                <div className="rounded-xl bg-card border border-border p-6 shadow-soft">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <Badge variant="secondary" className="mb-2">Day {selectedTask.day_number}</Badge>
                      <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                    </div>
                    {selectedProgress?.status === 'completed' ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedTask.estimated_time || '30 mins'}
                      </Badge>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none mb-6">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>

                  {selectedProgress?.status !== 'completed' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Notes (optional)
                        </label>
                        <Textarea
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          placeholder="Add any notes about your work..."
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={() => completeTask.mutate({ 
                          taskId: selectedTask.id, 
                          notes: submissionNotes 
                        })}
                        disabled={completeTask.isPending}
                        className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground"
                      >
                        {completeTask.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Complete (+{selectedTask.points} pts)
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {selectedProgress?.status === 'completed' && selectedProgress.submission_notes && (
                    <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm font-medium text-success mb-1">Your Notes</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProgress.submission_notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-card border border-border p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">Select a Day</h2>
                  <p className="text-muted-foreground">
                    Choose a day from the list to view the task details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyTasks;
