import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2, CreditCard, Wrench, User, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TelegramTicket {
  id: string;
  category: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const SUPPORT_CATEGORIES = [
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment issues, M-Pesa, refunds' },
  { id: 'technical', label: 'Technical Support', icon: Wrench, description: 'App issues, bugs, errors' },
  { id: 'account', label: 'Account Issues', icon: User, description: 'Login, profile, verification' },
  { id: 'other', label: 'Other', icon: FileText, description: 'General inquiries' },
];

export function SupportChat() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch user's tickets from telegram_support_tickets table using user_id
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['user_telegram_tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('telegram_support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TelegramTicket[];
    },
    enabled: !!user && isOpen,
    refetchInterval: isOpen ? 3000 : false, // Poll every 3 seconds for admin replies
  });

  const sendTicket = useMutation({
    mutationFn: async ({ category, message }: { category: string; message: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category,
          message,
          userName: profile?.full_name || user.email?.split('@')[0],
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send ticket');
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      setSelectedCategory(null);
      queryClient.invalidateQueries({ queryKey: ['user_telegram_tickets'] });
      toast.success('Support ticket sent! We\'ll respond via Telegram shortly.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tickets]);

  // Reset category when chat is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
    }
  }, [isOpen]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCategory) return;
    sendTicket.mutate({ category: selectedCategory, message: newMessage });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'replied':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'open':
        return <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  const hasTickets = tickets && tickets.length > 0;
  const showCategorySelection = !selectedCategory;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-hero hover:opacity-90 z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b bg-gradient-hero text-primary-foreground">
          <SheetTitle className="text-primary-foreground flex items-center gap-2">
            {selectedCategory && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <MessageCircle className="h-5 w-5" />
            Customer Support
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : showCategorySelection ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-primary opacity-70" />
                <h3 className="font-semibold text-lg mb-2">How can we help?</h3>
                <p className="text-sm text-muted-foreground">
                  Select a category to get started
                </p>
              </div>
              <div className="grid gap-3">
                {SUPPORT_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{category.label}</p>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Show existing tickets */}
              {hasTickets && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Your Recent Tickets</h4>
                  <div className="space-y-2">
                    {tickets?.slice(-3).map((ticket) => (
                      <div 
                        key={ticket.id} 
                        className="p-3 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-primary capitalize">
                            {ticket.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(ticket.status)}
                            <span className="text-xs text-muted-foreground capitalize">
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm truncate">{ticket.message}</p>
                        {ticket.admin_reply && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Reply:</p>
                            <p className="text-sm text-success">{ticket.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show the selected category */}
              <div className="text-center py-4">
                <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  {(() => {
                    const Icon = SUPPORT_CATEGORIES.find(c => c.id === selectedCategory)?.icon || MessageCircle;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <h3 className="font-semibold">
                  {SUPPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe your issue below and we'll get back to you via this chat
                </p>
              </div>

              {/* Show existing messages in this category */}
              {tickets?.filter(t => t.category === selectedCategory).map((ticket, index) => {
                const showDate = index === 0 || 
                  formatDate(ticket.created_at) !== formatDate(tickets.filter(t => t.category === selectedCategory)[index - 1]?.created_at);
                
                return (
                  <div key={ticket.id}>
                    {showDate && (
                      <div className="text-center text-xs text-muted-foreground my-4">
                        {formatDate(ticket.created_at)}
                      </div>
                    )}
                    {/* User message */}
                    <div className="flex justify-end mb-2">
                      <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gradient-hero text-primary-foreground rounded-tr-sm">
                        <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                        <p className="text-xs mt-1 text-primary-foreground/70">
                          {formatTime(ticket.created_at)}
                        </p>
                      </div>
                    </div>
                    {/* Admin reply */}
                    {ticket.admin_reply && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-card border border-border rounded-tl-sm">
                          <p className="text-sm whitespace-pre-wrap">{ticket.admin_reply}</p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            {formatTime(ticket.updated_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {selectedCategory && (
          <form onSubmit={handleSend} className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your issue..."
                className="flex-1"
                maxLength={1000}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sendTicket.isPending}
                className="bg-gradient-hero hover:opacity-90"
              >
                {sendTicket.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
