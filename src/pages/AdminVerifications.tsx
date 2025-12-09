import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { Shield, CheckCircle, Clock, XCircle, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Navigation } from '@/components/Navigation';

type DocumentType = 'drivers_license' | 'passport' | 'national_id';
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface Verification {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  document_url: string;
  document_back_url: string | null;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  provider_name?: string;
  provider_email?: string;
}

export default function AdminVerifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentBackUrl, setDocumentBackUrl] = useState<string | null>(null);

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
    loadVerifications();
  };

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Enrich with provider details
      const enriched = await Promise.all(
        (data || []).map(async (v) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', v.provider_id)
            .maybeSingle();

          return {
            ...v,
            provider_name: profile?.full_name || 'Unknown',
          } as Verification;
        })
      );

      setVerifications(enriched);
    } catch (error) {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (verification: Verification) => {
    setSelectedVerification(verification);
    setDocumentUrl(null);
    setDocumentBackUrl(null);
    
    // Get signed URL for the front document
    const { data, error } = await supabase.storage
      .from('id-documents')
      .createSignedUrl(verification.document_url, 300); // 5 min expiry

    if (error) {
      toast.error('Failed to load document');
      return;
    }

    setDocumentUrl(data.signedUrl);

    // Get signed URL for back document if it exists (driver's license)
    if (verification.document_back_url) {
      const { data: backData, error: backError } = await supabase.storage
        .from('id-documents')
        .createSignedUrl(verification.document_back_url, 300);

      if (!backError && backData) {
        setDocumentBackUrl(backData.signedUrl);
      }
    }

    setViewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('provider_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      toast.success('Provider verified successfully');
      setViewDialogOpen(false);
      setSelectedVerification(null);
      loadVerifications();
    } catch (error) {
      toast.error('Failed to approve verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('provider_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      toast.success('Verification rejected');
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedVerification(null);
      setRejectionReason('');
      loadVerifications();
    } catch (error) {
      toast.error('Failed to reject verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'drivers_license': return "Driver's License";
      case 'passport': return 'Passport';
      case 'national_id': return 'National ID';
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

  const pendingVerifications = verifications.filter(v => v.status === 'pending');
  const reviewedVerifications = verifications.filter(v => v.status !== 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Review and approve provider ID documents</p>
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="flex gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/disputes')}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Disputes
          </Button>
          <Button variant="default" size="sm">
            <Shield className="h-4 w-4 mr-1" /> ID Verifications
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingVerifications.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{verifications.filter(v => v.status === 'approved').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{verifications.filter(v => v.status === 'rejected').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Verifications
            </CardTitle>
            <CardDescription>ID documents awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingVerifications.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No pending verifications. All caught up!</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">
                        {format(new Date(v.submitted_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{v.provider_name}</TableCell>
                      <TableCell>{getDocumentTypeLabel(v.document_type)}</TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleViewDocument(v)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reviewed Verifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reviewed Verifications
            </CardTitle>
            <CardDescription>Previously reviewed submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewedVerifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No reviewed verifications yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedVerifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">
                        {format(new Date(v.submitted_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.reviewed_at && format(new Date(v.reviewed_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{v.provider_name}</TableCell>
                      <TableCell>{getDocumentTypeLabel(v.document_type)}</TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocument(v)}
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

      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review ID Document</DialogTitle>
            <DialogDescription>
              {selectedVerification && `${getDocumentTypeLabel(selectedVerification.document_type)} - ${selectedVerification.provider_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {documentUrl && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {selectedVerification?.document_type === 'drivers_license' 
                    ? "Front of Driver's License" 
                    : selectedVerification?.document_type === 'passport'
                    ? "Passport Photo Page"
                    : "Front of National ID"}
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  {documentUrl.includes('.pdf') ? (
                    <iframe src={documentUrl} className="w-full h-64" />
                  ) : (
                    <img 
                      src={documentUrl} 
                      alt="ID Document Front" 
                      className="w-full max-h-64 object-contain bg-muted"
                    />
                  )}
                </div>
              </div>

              {documentBackUrl && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Back of Driver's License</Label>
                  <div className="border rounded-lg overflow-hidden">
                    {documentBackUrl.includes('.pdf') ? (
                      <iframe src={documentBackUrl} className="w-full h-64" />
                    ) : (
                      <img 
                        src={documentBackUrl} 
                        alt="ID Document Back" 
                        className="w-full max-h-64 object-contain bg-muted"
                      />
                    )}
                  </div>
                </div>
              )}

              {selectedVerification?.status === 'rejected' && selectedVerification.rejection_reason && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Rejection reason:</strong> {selectedVerification.rejection_reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedVerification?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                >
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Approve'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The provider will be able to resubmit.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">Reason for Rejection</Label>
            <Textarea
              id="rejection_reason"
              placeholder="e.g., Document is blurry, expired, or doesn't match account name..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={submitting || !rejectionReason.trim()}
            >
              {submitting ? 'Rejecting...' : 'Reject Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
