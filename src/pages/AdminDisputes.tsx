import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, AlertTriangle, CheckCircle, Clock, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Navigation } from '@/components/Navigation';

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
  provider_name?: string;
}

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      checkAdminRole();
    }
  }, [user, authLoading, navigate]);

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

      // Enrich with job and user details
      const enrichedDisputes = await Promise.all(
        (disputesData || []).map(async (dispute) => {
          // Get job details
          const { data: jobData } = await supabase
            .from('job_requests')
            .select('title, customer_id, accepted_provider_id')
            .eq('id', dispute.job_id)
            .maybeSingle();

          // Get customer name
          const { data: customerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', dispute.customer_id)
            .maybeSingle();

          // Get provider name if available
          let providerName = 'N/A';
          if (jobData?.accepted_provider_id) {
            const { data: providerData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', jobData.accepted_provider_id)
              .maybeSingle();
            providerName = providerData?.full_name || 'Unknown';
          }

          return {
            ...dispute,
            job_title: jobData?.title || 'Unknown Job',
            customer_name: customerData?.full_name || 'Unknown',
            provider_name: providerName
          };
        })
      );

      setDisputes(enrichedDisputes);
    } catch (error: any) {
      toast.error('Failed to load disputes');
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

      // Log admin action
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
        },
      });

      toast.success('Dispute marked as resolved');
      setResolveDialogOpen(false);
      setSelectedDispute(null);
      setAdminNotes('');
      loadDisputes();
    } catch (error: any) {
      toast.error('Failed to resolve dispute');
    } finally {
      setSubmitting(false);
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

        {/* Admin Navigation */}
        <div className="flex gap-2 mb-6">
          <Button variant="default" size="sm">
            <AlertTriangle className="h-4 w-4 mr-1" /> Disputes
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/verifications')}>
            <Shield className="h-4 w-4 mr-1" /> ID Verifications
          </Button>
        </div>

        {/* Stats Cards */}
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

        {/* Open Disputes */}
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

        {/* Resolved Disputes */}
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

      {/* View Dispute Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Filed on {selectedDispute && format(new Date(selectedDispute.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
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
                  <p className="font-medium">{selectedDispute.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedDispute.provider_name}</p>
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
                View Job Details
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Mark this dispute as resolved. The job will remain in its current state.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Dispute Reason:</p>
                <p className="mt-1">{selectedDispute.reason}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResolveDialogOpen(false);
              setAdminNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleResolveDispute} disabled={submitting}>
              {submitting ? 'Resolving...' : 'Mark as Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}