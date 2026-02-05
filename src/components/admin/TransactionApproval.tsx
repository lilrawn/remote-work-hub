import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Clock, Eye, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  amount: number;
  payment_status: string;
  mpesa_checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  created_at: string;
  user_id: string | null;
  job_accounts?: { title: string } | null;
}

export function TransactionApproval() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const { data: pendingOrders, isLoading } = useQuery({
    queryKey: ['admin_pending_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, job_accounts(title)')
        .in('payment_status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approveOrderMutation = useMutation({
    mutationFn: async ({ orderId, receipt }: { orderId: string; receipt: string }) => {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          mpesa_receipt_number: receipt,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Get order details for creating purchase
      const order = pendingOrders?.find(o => o.id === orderId);
      
      // Get job_account_id from the order
      const { data: orderData } = await supabase
        .from('orders')
        .select('job_account_id')
        .eq('id', orderId)
        .single();
        
      if (order?.user_id && orderData?.job_account_id) {
        // Create user purchase
        const { error: purchaseError } = await supabase
          .from('user_purchases')
          .insert({
            user_id: order.user_id,
            job_account_id: orderData.job_account_id,
            order_id: orderId,
          });

        if (purchaseError) {
          console.error('Failed to create purchase:', purchaseError);
        }

        // Get current sold count and increment
        const { data: jobData } = await supabase
          .from('job_accounts')
          .select('sold_count')
          .eq('id', orderData.job_account_id)
          .single();
          
        // Update sold count
        const currentSold = jobData?.sold_count || 0;
        const { error: updateError } = await supabase
          .from('job_accounts')
          .update({ sold_count: currentSold + 1 })
          .eq('id', orderData.job_account_id);
          
        if (updateError) {
          console.error('Failed to update sold count:', updateError);
        }
      }
    },
    onSuccess: () => {
      toast.success('Transaction approved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin_pending_orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin_job_stock'] });
      setIsApproveOpen(false);
      setSelectedOrder(null);
      setReceiptNumber('');
    },
    onError: (error) => {
      console.error('Approve error:', error);
      toast.error('Failed to approve transaction');
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transaction rejected');
      queryClient.invalidateQueries({ queryKey: ['admin_pending_orders'] });
      setIsRejectOpen(false);
      setSelectedOrder(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject transaction');
    },
  });

  const handleApprove = () => {
    if (!selectedOrder || !receiptNumber.trim()) {
      toast.error('Please enter the M-Pesa receipt number');
      return;
    }
    approveOrderMutation.mutate({ orderId: selectedOrder.id, receipt: receiptNumber.trim() });
  };

  const handleReject = () => {
    if (!selectedOrder) return;
    rejectOrderMutation.mutate(selectedOrder.id);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-primary text-primary-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Processing
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pending Transactions
        </h3>
        <Badge variant="secondary">
          {pendingOrders?.length || 0} awaiting approval
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pendingOrders?.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
          <p className="text-muted-foreground">No pending transactions</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Job Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium">{order.customer_name}</TableCell>
                  <TableCell className="font-mono text-sm">{order.customer_phone}</TableCell>
                  <TableCell className="font-semibold text-success">
                    {formatPrice(order.amount)}
                  </TableCell>
                  <TableCell>{order.job_accounts?.title || '-'}</TableCell>
                  <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success hover:text-success"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsApproveOpen(true);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsRejectOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Order Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-mono">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p>{selectedOrder.customer_email || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-semibold text-success">{formatPrice(selectedOrder.amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Job Account:</span>
                  <p>{selectedOrder.job_accounts?.title || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p>{formatDate(selectedOrder.created_at)}</p>
                </div>
                {selectedOrder.mpesa_checkout_request_id && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">M-Pesa Checkout ID:</span>
                    <p className="font-mono text-xs break-all">{selectedOrder.mpesa_checkout_request_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Transaction</DialogTitle>
            <DialogDescription>
              Confirm payment received for {selectedOrder?.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-medium text-success">
                Amount: {selectedOrder && formatPrice(selectedOrder.amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ensure this amount has been received in your M-Pesa account
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="receipt">M-Pesa Receipt Number *</Label>
              <Input
                id="receipt"
                placeholder="e.g., ABC123XYZ"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Enter the M-Pesa transaction receipt number
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveOrderMutation.isPending || !receiptNumber.trim()}
              className="bg-success hover:bg-success/90"
            >
              {approveOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this transaction for {selectedOrder?.customer_name}? This will mark the order as failed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              {rejectOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Transaction'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
