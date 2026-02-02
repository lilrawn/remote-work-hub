import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['support_messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user && isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          message: message.trim(),
          is_from_admin: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['support_messages'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage);
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

  if (!user) {
    return null;
  }

  const unreadCount = messages?.filter(m => m.is_from_admin && !m.is_read).length || 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-hero hover:opacity-90 z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b bg-gradient-hero text-primary-foreground">
          <SheetTitle className="text-primary-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Customer Support
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Send us a message and we'll respond shortly!</p>
            </div>
          ) : (
            <>
              {messages?.map((msg, index) => {
                const showDate = index === 0 || 
                  formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center text-xs text-muted-foreground my-4">
                        {formatDate(msg.created_at)}
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex",
                        msg.is_from_admin ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2",
                          msg.is_from_admin
                            ? "bg-card border border-border rounded-tl-sm"
                            : "bg-gradient-hero text-primary-foreground rounded-tr-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.is_from_admin ? "text-muted-foreground" : "text-primary-foreground/70"
                        )}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              maxLength={1000}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sendMessage.isPending}
              className="bg-gradient-hero hover:opacity-90"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
