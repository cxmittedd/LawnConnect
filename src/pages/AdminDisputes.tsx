import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, AlertTriangle, CheckCircle, Clock, Eye, Image, MessageSquare, User, DollarSign, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { Navigation } from '@/components/Navigation';

interface DisputePhoto {
  id: string;
  photo_url: string;
  created_at: string;
}

interface DisputeResponse {
  id: string;
  response_text: string;
  created_at: string;
  photos: { id: string; photo_url: string }[];
}

interface DisputeMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface Dispute {
  id: string;
  job_id: string;
  customer_id: string;
  reason: string;
  status: string;
  resolved_at: string | null;
  created_at: string;
  job_title?: string;
  customer_name?: string;
  provider_id?: string;
  provider_name?: string;
  final_price?: number;
  photos?: DisputePhoto[];
  responses?: DisputeResponse[];
  messages?: DisputeMessage[];
}

type ResolutionType = 'favor_customer' | 'favor_provider' | 'partial_refund' | 'dismiss';

export default function AdminDisputes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionType, setResolutionType] = useState<ResolutionType>('favor_customer');
  const [refundPercentage, setRefundPercentage] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      checkAdminRole();
    }
  }, [user, authLoading, navigate]);

  /**
   * Security Note: This client-side admin check is for UX optimization only.
   * The actual security is enforced by Row Level Security (RLS) policies on all admin tables.
   * Even if this check is bypassed, unauthorized users will see an empty UI because
   * RLS policies (using has_role(auth.uid(), 'admin')) block all data access server-side.
   */
  const checkAdminRole = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error || !data) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    loadDisputes();
  };

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const { data: disputesData, error } = await supabase
        .from('job_disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedDisputes = await Promise.all(
        (disputesData || []).map(async (dispute) => {
          const { data: jobData } = await supabase
            .from('job_requests')
            .select('title, customer_id, accepted_provider_id, final_price')
            .eq('id', dispute.job_id)
            .maybeSingle();

          const { data: customerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', dispute.customer_id)
            .maybeSingle();

          let providerName = 'N/A';
          if (jobData?.accepted_provider_id) {
            const { data: providerData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', jobData.accepted_provider_id)
              .maybeSingle();
            providerName = providerData?.full_name || 'Unknown';
          }

          const { data: photosData } = await supabase
            .from('dispute_photos')
            .select('id, photo_url, created_at')
            .eq('dispute_id', dispute.id);

          const { data: responsesData } = await supabase
            .from('dispute_responses')
            .select('id, response_text, created_at')
            .eq('dispute_id', dispute.id)
            .order('created_at', { ascending: true });

          const responsesWithPhotos = await Promise.all(
            (responsesData || []).map(async (response) => {
              const { data: responsePhotos } = await supabase
                .from('dispute_response_photos')
                .select('id, photo_url')
                .eq('response_id', response.id);
              return { ...response, photos: responsePhotos || [] };
            })
          );

          // Load dispute messages
          const { data: messagesData } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', dispute.id)
            .order('created_at', { ascending: true });

          return {
            ...dispute,
            job_title: jobData?.title || 'Unknown Job',
            customer_name: customerData?.full_name || 'Unknown',
            provider_id: jobData?.accepted_provider_id,
            provider_name: providerName,
            final_price: jobData?.final_price,
            photos: photosData || [],
            responses: responsesWithPhotos,
            messages: messagesData || [],
          };
        })
      );

      setDisputes(enrichedDisputes);
    } catch (error) {
      safeToast.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_disputes')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      let refundAmount = 0;
      let refundReason = '';

      if (resolutionType === 'favor_customer') {
        await supabase
          .from('job_requests')
          .update({
            status: 'cancelled',
            provider_payout: 0,
            platform_fee: 0,
          })
          .eq('id', selectedDispute.job_id);
        
        refundAmount = selectedDispute.final_price || 0;
        refundReason = `Full refund - Dispute resolved in favor of customer. Original dispute reason: ${selectedDispute.reason}`;
      } else if (resolutionType === 'favor_provider') {
        const payoutPercentage = 0.70;
        const providerPayout = (selectedDispute.final_price || 0) * payoutPercentage;
        const platformFee = (selectedDispute.final_price || 0) * (1 - payoutPercentage);
        
        await supabase
          .from('job_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            provider_payout: providerPayout,
            platform_fee: platformFee,
          })
          .eq('id', selectedDispute.job_id);
      } else if (resolutionType === 'partial_refund') {
        const providerPayout = (selectedDispute.final_price || 0) * (refundPercentage / 100);
        const platformFee = (selectedDispute.final_price || 0) - providerPayout;
        
        await supabase
          .from('job_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            provider_payout: providerPayout,
            platform_fee: platformFee,
          })
          .eq('id', selectedDispute.job_id);
        
        refundAmount = (selectedDispute.final_price || 0) * ((100 - refundPercentage) / 100);
        refundReason = `Partial refund (${100 - refundPercentage}%) - Dispute resolved with partial refund. Original dispute reason: ${selectedDispute.reason}`;
      }

      // Create refund request for customer-favoring resolutions
      if (resolutionType === 'favor_customer' || resolutionType === 'partial_refund') {
        await supabase.from('refund_requests').insert({
          customer_id: selectedDispute.customer_id,
          job_id: selectedDispute.job_id,
          reason: refundReason,
          status: 'approved',
          admin_notes: `Refund amount: J$${refundAmount.toLocaleString()}. ${adminNotes ? `Admin notes: ${adminNotes}` : ''}`,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        });
      }

      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'resolve_dispute',
        entity_type: 'job_dispute',
        entity_id: selectedDispute.id,
        details: {
          job_id: selectedDispute.job_id,
          job_title: selectedDispute.job_title,
          customer_name: selectedDispute.customer_name,
          provider_name: selectedDispute.provider_name,
          reason: selectedDispute.reason,
          resolution_type: resolutionType,
          admin_notes: adminNotes,
          refund_percentage: resolutionType === 'partial_refund' ? refundPercentage : null,
          refund_amount: refundAmount > 0 ? refundAmount : null,
        },
      });

      toast.success(refundAmount > 0 
        ? 'Dispute resolved and refund added to pending refunds' 
        : 'Dispute resolved successfully');
      setResolveDialogOpen(false);
      setSelectedDispute(null);
      setAdminNotes('');
      setResolutionType('favor_customer');
      loadDisputes();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDispute || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: selectedDispute.id,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim(),
        });

      if (error) throw error;

      // Refresh the selected dispute's messages
      const { data: messagesData } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('dispute_id', selectedDispute.id)
        .order('created_at', { ascending: true });

      setSelectedDispute({
        ...selectedDispute,
        messages: messagesData || [],
      });

      setNewMessage('');
      toast.success('Message sent to customer');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Open</Badge>;
      case 'resolved':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const openDisputes = disputes.filter(d => d.status === 'open');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage disputes across the platform</p>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Open Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{openDisputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{resolvedDisputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{disputes.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Open Disputes
            </CardTitle>
            <CardDescription>Disputes requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {openDisputes.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No open disputes. All clear!</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="text-sm">
                        {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{dispute.job_title}</TableCell>
                      <TableCell>{dispute.customer_name}</TableCell>
                      <TableCell>{dispute.provider_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(dispute.photos?.length || 0) > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Image className="h-3 w-3" /> {dispute.photos?.length}
                            </Badge>
                          )}
                          {(dispute.responses?.length || 0) > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <MessageSquare className="h-3 w-3" /> {dispute.responses?.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setResolveDialogOpen(true);
                            }}
                          >
                            Resolve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Resolved Disputes
            </CardTitle>
            <CardDescription>Previously resolved disputes</CardDescription>
          </CardHeader>
          <CardContent>
            {resolvedDisputes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No resolved disputes yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Filed</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="text-sm">
                        {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {dispute.resolved_at && format(new Date(dispute.resolved_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{dispute.job_title}</TableCell>
                      <TableCell>{dispute.customer_name}</TableCell>
                      <TableCell>{dispute.provider_name}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Filed on {selectedDispute && format(new Date(selectedDispute.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <ScrollArea className="max-h-[60vh]">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="customer">Evidence</TabsTrigger>
                  <TabsTrigger value="provider">Provider</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Job</p>
                      <p className="font-medium">{selectedDispute.job_title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(selectedDispute.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" /> {selectedDispute.customer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" /> {selectedDispute.provider_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Job Amount</p>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> J${selectedDispute.final_price?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reason for Dispute</p>
                    <div className="p-3 bg-muted rounded-md">
                      <p>{selectedDispute.reason}</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/job/${selectedDispute.job_id}`)}
                  >
                    View Full Job Details
                  </Button>
                </TabsContent>

                <TabsContent value="customer" className="space-y-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Customer's Evidence Photos</p>
                    {selectedDispute.photos && selectedDispute.photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedDispute.photos.map((photo) => (
                          <div key={photo.id} className="relative aspect-video rounded-md overflow-hidden border">
                            <img
                              src={photo.photo_url}
                              alt="Dispute evidence"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No photos submitted by customer</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="provider" className="space-y-4 mt-4">
                  {selectedDispute.responses && selectedDispute.responses.length > 0 ? (
                    selectedDispute.responses.map((response) => (
                      <div key={response.id} className="border rounded-md p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-muted-foreground">
                            Response on {format(new Date(response.created_at), 'MMM dd, yyyy \'at\' h:mm a')}
                          </p>
                        </div>
                        <p>{response.response_text}</p>
                        {response.photos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {response.photos.map((photo) => (
                              <div key={photo.id} className="relative aspect-video rounded-md overflow-hidden border">
                                <img
                                  src={photo.photo_url}
                                  alt="Provider evidence"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No response from provider yet</p>
                  )}
                </TabsContent>

                <TabsContent value="messages" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {selectedDispute.messages && selectedDispute.messages.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {selectedDispute.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-md ${
                              msg.sender_type === 'admin'
                                ? 'bg-primary/10 ml-4'
                                : 'bg-muted mr-4'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">
                                {msg.sender_type === 'admin' ? 'Support' : 'Customer'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), 'MMM dd, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No messages yet. Send a message to the customer below.
                      </p>
                    )}
                  </div>

                  {selectedDispute.status === 'open' && (
                    <div className="space-y-2 border-t pt-4">
                      <Textarea
                        placeholder="Type your message to the customer..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedDispute?.status === 'open' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                setResolveDialogOpen(true);
              }}>
                Resolve Dispute
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Choose how to resolve this dispute between {selectedDispute?.customer_name} and {selectedDispute?.provider_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Dispute Reason:</p>
                <p className="mt-1">{selectedDispute.reason}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Resolution Type</p>
                <div className="grid gap-2">
                  <Button
                    variant={resolutionType === 'favor_customer' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setResolutionType('favor_customer')}
                  >
                    <div className="text-left">
                      <p className="font-medium">Favor Customer</p>
                      <p className="text-xs text-muted-foreground">Cancel job, no payout to provider</p>
                    </div>
                  </Button>
                  <Button
                    variant={resolutionType === 'favor_provider' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setResolutionType('favor_provider')}
                  >
                    <div className="text-left">
                      <p className="font-medium">Favor Provider</p>
                      <p className="text-xs text-muted-foreground">Complete job, full payout (80%) to provider</p>
                    </div>
                  </Button>
                  <Button
                    variant={resolutionType === 'partial_refund' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setResolutionType('partial_refund')}
                  >
                    <div className="text-left">
                      <p className="font-medium">Partial Resolution</p>
                      <p className="text-xs text-muted-foreground">Complete job with reduced payout</p>
                    </div>
                  </Button>
                  <Button
                    variant={resolutionType === 'dismiss' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setResolutionType('dismiss')}
                  >
                    <div className="text-left">
                      <p className="font-medium">Dismiss</p>
                      <p className="text-xs text-muted-foreground">Close dispute, leave job in current state</p>
                    </div>
                  </Button>
                </div>

                {resolutionType === 'partial_refund' && (
                  <div className="space-y-2">
                    <label className="text-sm">Provider Payout Percentage: {refundPercentage}%</label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={refundPercentage}
                      onChange={(e) => setRefundPercentage(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      Provider receives: J${((selectedDispute.final_price || 0) * (refundPercentage / 100)).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add any notes about this resolution..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResolveDialogOpen(false);
              setAdminNotes('');
              setResolutionType('favor_customer');
            }}>
              Cancel
            </Button>
            <Button onClick={handleResolveDispute} disabled={submitting}>
              {submitting ? 'Resolving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}