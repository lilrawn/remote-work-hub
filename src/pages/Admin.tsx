import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useJobAccounts } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import { jobAccountSchema, JobAccountFormData } from '@/lib/validations';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Package,
  CreditCard,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  MessageCircle,
  Send,
  Eye,
  User,
  Users,
  Boxes,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserManagement } from '@/components/admin/UserManagement';
import { StockManagement } from '@/components/admin/StockManagement';
import { TransactionApproval } from '@/components/admin/TransactionApproval';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  amount: number;
  payment_status: string;
  mpesa_receipt_number: string | null;
  created_at: string;
  job_accounts?: { title: string } | null;
}

interface SupportConversation {
  user_id: string;
  user_email: string;
  user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface SupportMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { data: categories } = useCategories();
  const { data: jobs, refetch: refetchJobs } = useJobAccounts();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientView, setIsClientView] = useState(false);
  
  // Support chat state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const form = useForm<JobAccountFormData>({
    resolver: zodResolver(jobAccountSchema),
    defaultValues: {
      title: '',
      description: '',
      company: '',
      price: 2000,
      monthly_earnings: '',
      skills_required: [],
      category_id: '',
      is_available: true,
    },
  });

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['admin_conversations'],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('user_id, message, is_from_admin, is_read, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Group by user
      const userMap = new Map<string, SupportConversation>();
      
      for (const msg of messages || []) {
        if (!userMap.has(msg.user_id)) {
          // Fetch user info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', msg.user_id)
            .single();
          
          userMap.set(msg.user_id, {
            user_id: msg.user_id,
            user_email: profile?.email || 'Unknown',
            user_name: profile?.full_name || 'Unknown User',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        
        const conv = userMap.get(msg.user_id)!;
        if (!msg.is_from_admin && !msg.is_read) {
          conv.unread_count++;
        }
      }
      
      return Array.from(userMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  // Fetch messages for selected user
  const { data: selectedMessages } = useQuery({
    queryKey: ['admin_messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Mark as read
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', selectedUserId)
        .eq('is_from_admin', false);
      
      return data as SupportMessage[];
    },
    enabled: !!selectedUserId && isAdmin,
    refetchInterval: 5000,
  });

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedUserId) throw new Error('No user selected');
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: selectedUserId,
          message: message.trim(),
          is_from_admin: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin_messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin_conversations'] });
    },
    onError: () => {
      toast.error('Failed to send reply');
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessages]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, job_accounts(title)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

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
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
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

  const handleSubmitJob = async (data: JobAccountFormData) => {
    setIsSubmitting(true);
    try {
      const jobData = {
        title: data.title,
        description: data.description,
        company: data.company || null,
        price: data.price,
        monthly_earnings: data.monthly_earnings || null,
        skills_required: data.skills_required?.length ? data.skills_required : null,
        category_id: data.category_id,
        is_available: data.is_available,
      };

      if (editingJob) {
        const { error } = await supabase
          .from('job_accounts')
          .update(jobData)
          .eq('id', editingJob);

        if (error) throw error;
        toast.success('Job account updated successfully');
      } else {
        const { error } = await supabase
          .from('job_accounts')
          .insert(jobData);

        if (error) throw error;
        toast.success('Job account created successfully');
      }

      form.reset();
      setEditingJob(null);
      setIsDialogOpen(false);
      refetchJobs();
    } catch (err) {
      toast.error('Failed to save job account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job.id);
    form.reset({
      title: job.title,
      description: job.description,
      company: job.company || '',
      price: job.price,
      monthly_earnings: job.monthly_earnings || '',
      skills_required: job.skills_required || [],
      category_id: job.category_id || '',
      is_available: job.is_available,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job account?')) return;

    try {
      const { error } = await supabase
        .from('job_accounts')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job account deleted');
      refetchJobs();
    } catch (err) {
      toast.error('Failed to delete job account');
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    sendReply.mutate(replyMessage);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.payment_status === 'completed').length;
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'completed')
    .reduce((sum, o) => sum + o.amount, 0);
  const unreadMessages = conversations?.reduce((sum, c) => sum + c.unread_count, 0) || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* View Toggle */}
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={() => setIsClientView(!isClientView)}
          variant="outline"
          size="sm"
          className="gap-2 shadow-lg bg-background"
        >
          {isClientView ? (
            <>
              <Eye className="h-4 w-4" />
              Client View
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4" />
              Admin View
            </>
          )}
        </Button>
      </div>

      {isClientView ? (
        // Client View - redirect to home
        <main className="flex-1 py-8">
          <div className="container text-center">
            <p className="text-muted-foreground mb-4">Viewing as client...</p>
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </div>
        </main>
      ) : (
        <main className="flex-1 py-8">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage job accounts, orders, and customer support</p>
              </div>
              <Badge variant="secondary" className="text-sm">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Admin Access
              </Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{jobs?.length || 0}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <Package className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <CheckCircle2 className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedOrders}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                    <MessageCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unread</p>
                    <p className="text-2xl font-bold">{unreadMessages}</p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="flex-wrap">
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="transactions" className="gap-1">
                  <Receipt className="h-4 w-4" />
                  Approvals
                </TabsTrigger>
                <TabsTrigger value="jobs">Job Accounts</TabsTrigger>
                <TabsTrigger value="stock" className="gap-1">
                  <Boxes className="h-4 w-4" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="support" className="relative">
                  Customer Support
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Orders Tab */}
              <TabsContent value="orders">
                <div className="rounded-xl bg-card shadow-soft border border-border">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Recent Orders
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    {isLoadingOrders ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No orders yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-sm">
                                {order.id.slice(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell>{order.customer_name}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {order.customer_phone}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatPrice(order.amount)}
                              </TableCell>
                              <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(order.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Jobs Tab */}
              <TabsContent value="jobs">
                <div className="rounded-xl bg-card shadow-soft border border-border">
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Job Accounts
                    </h2>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setEditingJob(null);
                            form.reset();
                          }}
                          className="bg-gradient-hero hover:opacity-90 text-primary-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{editingJob ? 'Edit' : 'Add'} Job Account</DialogTitle>
                          <DialogDescription>
                            Fill in the details for the job account
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit(handleSubmitJob)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" {...form.register('title')} />
                            {form.formState.errors.title && (
                              <p className="text-xs text-destructive">
                                {form.formState.errors.title.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...form.register('description')} />
                            {form.formState.errors.description && (
                              <p className="text-xs text-destructive">
                                {form.formState.errors.description.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="company">Company</Label>
                              <Input id="company" {...form.register('company')} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price">Price (KSH)</Label>
                              <Input
                                id="price"
                                type="number"
                                {...form.register('price', { valueAsNumber: true })}
                              />
                              {form.formState.errors.price && (
                                <p className="text-xs text-destructive">
                                  {form.formState.errors.price.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="monthly_earnings">Monthly Earnings</Label>
                              <Input
                                id="monthly_earnings"
                                placeholder="e.g., KSH 20,000 - 35,000"
                                {...form.register('monthly_earnings')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Select
                                value={form.watch('category_id')}
                                onValueChange={(value) => form.setValue('category_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.formState.errors.category_id && (
                                <p className="text-xs text-destructive">
                                  {form.formState.errors.category_id.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Job Account'
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs?.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {job.company || '-'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatPrice(job.price)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={job.is_available ? 'default' : 'secondary'}>
                                {job.is_available ? 'Available' : 'Unavailable'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditJob(job)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteJob(job.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Transaction Approval Tab */}
              <TabsContent value="transactions">
                <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                  <TransactionApproval />
                </div>
              </TabsContent>

              {/* Stock Management Tab */}
              <TabsContent value="stock">
                <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                  <StockManagement />
                </div>
              </TabsContent>

              {/* User Management Tab */}
              <TabsContent value="users">
                <div className="rounded-xl bg-card shadow-soft border border-border p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5" />
                    User Management
                  </h3>
                  <UserManagement />
                </div>
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support">
                <div className="rounded-xl bg-card shadow-soft border border-border overflow-hidden">
                  <div className="grid md:grid-cols-3 h-[600px]">
                    {/* Conversations List */}
                    <div className="border-r">
                      <div className="p-4 border-b bg-muted/50">
                        <h2 className="font-semibold flex items-center gap-2">
                          <MessageCircle className="h-5 w-5" />
                          Conversations
                        </h2>
                      </div>
                      <ScrollArea className="h-[calc(600px-57px)]">
                        {conversationsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : conversations?.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No conversations yet
                          </div>
                        ) : (
                          conversations?.map((conv) => (
                            <button
                              key={conv.user_id}
                              onClick={() => setSelectedUserId(conv.user_id)}
                              className={cn(
                                "w-full p-4 text-left border-b hover:bg-muted/50 transition-colors",
                                selectedUserId === conv.user_id && "bg-muted"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-medium">
                                  {conv.user_name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium truncate">{conv.user_name}</p>
                                    {conv.unread_count > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {conv.unread_count}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {conv.last_message}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(conv.last_message_at)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </ScrollArea>
                    </div>

                    {/* Chat Area */}
                    <div className="md:col-span-2 flex flex-col">
                      {selectedUserId ? (
                        <>
                          {/* Chat Header */}
                          <div className="p-4 border-b bg-muted/50 flex items-center gap-3">
                            <User className="h-5 w-5" />
                            <span className="font-medium">
                              {conversations?.find(c => c.user_id === selectedUserId)?.user_name}
                            </span>
                          </div>

                          {/* Messages */}
                          <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                              {selectedMessages?.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex",
                                    msg.is_from_admin ? "justify-end" : "justify-start"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "max-w-[70%] rounded-2xl px-4 py-2",
                                      msg.is_from_admin
                                        ? "bg-gradient-hero text-primary-foreground rounded-tr-sm"
                                        : "bg-muted rounded-tl-sm"
                                    )}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <p className={cn(
                                      "text-xs mt-1",
                                      msg.is_from_admin ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}>
                                      {formatTime(msg.created_at)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </div>
                          </ScrollArea>

                          {/* Reply Input */}
                          <form onSubmit={handleSendReply} className="p-4 border-t bg-background">
                            <div className="flex gap-2">
                              <Input
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1"
                              />
                              <Button
                                type="submit"
                                size="icon"
                                disabled={!replyMessage.trim() || sendReply.isPending}
                                className="bg-gradient-hero hover:opacity-90"
                              >
                                {sendReply.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </form>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a conversation to view messages</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}
      <Footer />
    </div>
  );
};

export default Admin;
