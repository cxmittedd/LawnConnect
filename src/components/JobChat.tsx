import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, User, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ParticipantInfo {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  company_name: string | null;
}

interface JobChatProps {
  jobId: string;
  customerId: string;
  providerId: string;
  isCustomer: boolean;
}

export const JobChat = ({ jobId, customerId, providerId, isCustomer }: JobChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ParticipantInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read receipts disabled

  useEffect(() => {
    loadMessages();
    loadOtherParticipant();

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const loadOtherParticipant = async () => {
    const otherUserId = isCustomer ? providerId : customerId;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, company_name')
      .eq('id', otherUserId)
      .single();

    if (!error && data) {
      setOtherParticipant(data);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase
      .from('messages')
      .insert({
        job_id: jobId,
        sender_id: user.id,
        content: newMessage.trim()
      });

    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Chat with {isCustomer ? "Provider" : "Customer"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Other participant info card */}
        {otherParticipant && (
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {isCustomer ? "Provider" : "Customer"} Information
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {otherParticipant.full_name || "Not provided"}
                  {otherParticipant.company_name && ` (${otherParticipant.company_name})`}
                </span>
              </div>
              {otherParticipant.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${otherParticipant.phone_number}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {otherParticipant.phone_number}
                  </a>
                </div>
              )}
              {!isCustomer && otherParticipant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{otherParticipant.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages area */}
        <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {format(new Date(message.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message input */}
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
