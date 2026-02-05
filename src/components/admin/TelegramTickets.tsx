import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  MessageSquare,
  Search,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Filter,
} from 'lucide-react';

interface TelegramTicket {
  id: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  category: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

export const TelegramTickets = () => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<TelegramTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['telegram_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TelegramTicket[];
    },
  });

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('telegram_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_support_tickets',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['telegram_tickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status, admin_reply }: { id: string; status: string; admin_reply?: string }) => {
      const updateData: { status: string; admin_reply?: string } = { status };
      if (admin_reply !== undefined) {
        updateData.admin_reply = admin_reply;
      }

      const { error } = await supabase
        .from('telegram_support_tickets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram_tickets'] });
      toast.success('Ticket updated');
      setSelectedTicket(null);
      setReplyText('');
    },
    onError: () => {
      toast.error('Failed to update ticket');
    },
  });

  const handleReply = () => {
    if (!selectedTicket || !replyText.trim()) return;
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      status: 'replied',
      admin_reply: replyText.trim(),
    });
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateTicketMutation.mutate({ id: ticketId, status: newStatus });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'replied':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Replied
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      payments: 'bg-primary/10 text-primary',
      technical: 'bg-accent/10 text-accent',
      account: 'bg-success/10 text-success',
      other: 'bg-muted text-muted-foreground',
    };
    return (
      <Badge variant="outline" className={colors[category.toLowerCase()] || colors.other}>
        {category}
      </Badge>
    );
  };

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      searchQuery === '' ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.telegram_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.telegram_first_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openTickets = tickets?.filter((t) => t.status === 'open').length || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-soft border border-border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Telegram Support Tickets
            {openTickets > 0 && (
              <Badge variant="destructive" className="ml-2">
                {openTickets} open
              </Badge>
            )}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by message or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {!filteredTickets || filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No support tickets found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {ticket.telegram_first_name || 'Unknown'}
                        </p>
                        {ticket.telegram_username && (
                          <p className="text-xs text-muted-foreground">
                            @{ticket.telegram_username}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">{ticket.message}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(ticket.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setReplyText(ticket.admin_reply || '');
                        }}
                      >
                        View
                      </Button>
                      {ticket.status !== 'closed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(ticket.id, 'closed')}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Ticket
            </DialogTitle>
            <DialogDescription>
              View ticket details and send a reply
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedTicket.telegram_first_name || 'Unknown User'}
                    </p>
                    {selectedTicket.telegram_username && (
                      <p className="text-sm text-muted-foreground">
                        @{selectedTicket.telegram_username}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {getCategoryBadge(selectedTicket.category)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-1">Message:</p>
                <p className="text-sm">{selectedTicket.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(selectedTicket.created_at)}
                </p>
              </div>

              {selectedTicket.admin_reply && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <p className="text-sm font-medium mb-1">Previous Reply:</p>
                  <p className="text-sm">{selectedTicket.admin_reply}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Reply (sent via Telegram):</label>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReply}
                  disabled={!replyText.trim() || updateTicketMutation.isPending}
                  className="gap-2"
                >
                  {updateTicketMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
