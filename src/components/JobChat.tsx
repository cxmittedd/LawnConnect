import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Send, User, Phone, MapPin, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

interface ProxySession {
  proxyNumber: string;
  expiresAt: string;
}

interface JobChatProps {
  jobId: string;
  customerId: string;
  providerId: string;
  isCustomer: boolean;
  jobStatus?: string;
}

export const JobChat = ({ jobId, customerId, providerId, isCustomer, jobStatus }: JobChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ParticipantInfo | null>(null);
  const [proxySession, setProxySession] = useState<ProxySession | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [confirmCallOpen, setConfirmCallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if job allows calling (accepted, in_progress, pending_completion)
  const canCall = ["accepted", "in_progress", "pending_completion"].includes(jobStatus || "");

  const otherPhoneLast4 = otherParticipant?.phone_number
    ? otherParticipant.phone_number.replace(/\D/g, "").slice(-4)
    : null;

  useEffect(() => {
    loadMessages();
    loadOtherParticipant();
    if (canCall && providerId) {
      loadProxySession();
    }

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
  }, [jobId, user?.id, canCall, providerId]);

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
    
    // Use the safe profile function that only returns phone/address for accepted job relationships
    const { data, error } = await supabase
      .rpc('get_profile_safe', { target_user_id: otherUserId })
      .single();

    if (!error && data) {
      setOtherParticipant({
        id: data.id,
        full_name: data.first_name ? `${data.first_name}${data.last_name ? ' ' + data.last_name : ''}` : null,
        phone_number: data.phone_number,
        address: data.address,
        company_name: data.company_name,
      });
    }
  };

  const loadProxySession = async () => {
    // Check for existing proxy session
    const { data } = await supabase
      .from('proxy_sessions')
      .select('twilio_proxy_number, expires_at')
      .eq('job_id', jobId)
      .eq('status', 'active')
      .single();

    if (data) {
      setProxySession({
        proxyNumber: data.twilio_proxy_number,
        expiresAt: data.expires_at,
      });
    }
  };

  const createProxySession = async () => {
    setProxyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-proxy-session', {
        body: { jobId }
      });

      if (error) {
        console.error('Failed to create proxy session:', error);
        toast.error('Failed to enable secure calling');
        return;
      }

      if (data?.proxyNumber) {
        setProxySession({
          proxyNumber: data.proxyNumber,
          expiresAt: data.expiresAt,
        });
        toast.success('Secure calling enabled!');
      }
    } catch (error) {
      console.error('Error creating proxy session:', error);
      toast.error('Failed to enable secure calling');
    } finally {
      setProxyLoading(false);
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

  const initiateSecureCall = async () => {
    setCallLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initiate-secure-call', {
        body: { jobId }
      });

      if (error) {
        console.error('Failed to initiate call:', error);
        toast.error('Failed to initiate call. Please try again.');
        return;
      }

      if (data?.success) {
        toast.success(data.message || 'Your phone will ring shortly!');
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call. Please try again.');
    } finally {
      setCallLoading(false);
    }
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
              
              {/* Secure Calling Section */}
              {canCall && (
                <div className="pt-2 border-t mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Secure Calling</span>
                    <Badge variant="secondary" className="text-xs">Protected</Badge>
                  </div>
                  
                  {proxySession ? (
                    <div className="bg-primary/10 rounded-md p-3 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Tap below to securely call the {isCustomer ? "provider" : "customer"}. Your phone will ring and connect you automatically.
                      </p>
                      
                      {/* Call Now Button - Uses server-initiated call for accurate job routing */}
                      <Button 
                        onClick={() => setConfirmCallOpen(true)}
                        disabled={callLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        {callLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Calling...
                          </>
                        ) : (
                          <>
                            <Phone className="h-5 w-5 mr-2" />
                            Call Now
                          </>
                        )}
                      </Button>

                      <AlertDialog open={confirmCallOpen} onOpenChange={setConfirmCallOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm call</AlertDialogTitle>
                            <AlertDialogDescription>
                              You’re about to call the {isCustomer ? "provider" : "customer"}{" "}
                              <span className="font-medium text-foreground">
                                {otherParticipant.full_name || "(name unavailable)"}
                              </span>
                              {otherPhoneLast4 ? (
                                <> (number ending {otherPhoneLast4})</>
                              ) : (
                                <> (no phone number on file)</>
                              )}
                              . If this doesn’t look right, cancel and ask them to update their phone number in Settings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                if (!otherPhoneLast4) {
                                  toast.error("Cannot call: the other party has no phone number on file.");
                                  return;
                                }
                                setConfirmCallOpen(false);
                                initiateSecureCall();
                              }}
                            >
                              Call
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Your real number stays private • Expires {format(new Date(proxySession.expiresAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Enable secure calling to contact the {isCustomer ? "provider" : "customer"} without sharing your personal number.
                      </p>
                      <Button 
                        size="sm" 
                        onClick={createProxySession}
                        disabled={proxyLoading}
                        className="w-full"
                      >
                        {proxyLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4 mr-2" />
                            Enable Secure Calling
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
