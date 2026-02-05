import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Edit, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface JobAccount {
  id: string;
  title: string;
  total_stock: number | null;
  sold_count: number | null;
  is_available: boolean;
  price: number;
}

export function StockManagement() {
  const [editingJob, setEditingJob] = useState<JobAccount | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['admin_job_stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_accounts')
        .select('id, title, total_stock, sold_count, is_available, price')
        .order('title', { ascending: true });

      if (error) throw error;
      return data as JobAccount[];
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ jobId, stock }: { jobId: string; stock: number }) => {
      const { error } = await supabase
        .from('job_accounts')
        .update({ total_stock: stock })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin_job_stock'] });
      queryClient.invalidateQueries({ queryKey: ['job_accounts'] });
      setIsDialogOpen(false);
      setEditingJob(null);
    },
    onError: () => {
      toast.error('Failed to update stock');
    },
  });

  const handleEditStock = (job: JobAccount) => {
    setEditingJob(job);
    setNewStock(job.total_stock || 0);
    setIsDialogOpen(true);
  };

  const handleSaveStock = () => {
    if (!editingJob) return;
    updateStockMutation.mutate({ jobId: editingJob.id, stock: newStock });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getAvailableStock = (job: JobAccount) => {
    const total = job.total_stock || 0;
    const sold = job.sold_count || 0;
    return Math.max(0, total - sold);
  };

  const getStockStatus = (job: JobAccount) => {
    const available = getAvailableStock(job);
    if (available === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (available <= 5) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stock Management
        </h3>
        <Badge variant="secondary">
          {jobs?.length || 0} job accounts
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Account</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-center">Total Stock</TableHead>
                <TableHead className="text-center">Sold</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => {
                const available = getAvailableStock(job);
                const status = getStockStatus(job);
                
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(job.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{job.total_stock || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{job.sold_count || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={available === 0 ? 'destructive' : available <= 5 ? 'secondary' : 'default'}
                      >
                        {available}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStock(job)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Adjust the total stock for {editingJob?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current sold:</span>
              <Badge variant="secondary">{editingJob?.sold_count || 0}</Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">Total Stock</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewStock(Math.max(0, newStock - 10))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="stock"
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center"
                  min={0}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewStock(newStock + 10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Will be available:</span>
              <Badge variant={newStock - (editingJob?.sold_count || 0) <= 0 ? 'destructive' : 'default'}>
                {Math.max(0, newStock - (editingJob?.sold_count || 0))}
              </Badge>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStock}
              disabled={updateStockMutation.isPending}
              className="bg-gradient-hero hover:opacity-90"
            >
              {updateStockMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
