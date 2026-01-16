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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Landmark, CheckCircle, Clock, XCircle, Eye, FileText, DollarSign, Calendar, Copy, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format, nextSaturday, addWeeks, isAfter, isBefore, startOfDay } from 'date-fns';
import { Navigation } from '@/components/Navigation';

type BankingStatus = 'pending' | 'verified' | 'rejected';

interface BankingDetails {
  id: string;
  provider_id: string;
  full_legal_name: string;
  bank_name: 'scotiabank_jamaica' | 'ncb_jamaica';
  branch_name: string;
  branch_number: string | null;
  account_number: string;
  account_type: 'savings' | 'chequing';
  trn: string;
  status: BankingStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  provider_name?: string;
}

interface ProviderPayout {
  provider_id: string;
  provider_name: string;
  pending_amount: number;
  jobs_count: number;
  banking: BankingDetails | null;
}

export default function AdminBanking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bankingRecords, setBankingRecords] = useState<BankingDetails[]>([]);
  const [providerPayouts, setProviderPayouts] = useState<ProviderPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BankingDetails | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<ProviderPayout | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
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
    loadBankingRecords();
    loadProviderPayouts();
  };

  const loadBankingRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_banking_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with provider names
      const enriched = await Promise.all(
        (data || []).map(async (record) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, first_name, last_name')
            .eq('id', record.provider_id)
            .maybeSingle();

          return {
            ...record,
            provider_name: profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          } as BankingDetails;
        })
      );

      setBankingRecords(enriched);
    } catch (error) {
      toast.error('Failed to load banking records');
    } finally {
      setLoading(false);
    }
  };

  const loadProviderPayouts = async () => {
    setLoadingPayouts(true);
    try {
      // Get all completed jobs that haven't been paid out yet (no payout record)
      const { data: jobs, error: jobsError } = await supabase
        .from('job_requests')
        .select('id, accepted_provider_id, provider_payout, final_price, base_price, title')
        .eq('status', 'completed')
        .not('accepted_provider_id', 'is', null);

      if (jobsError) throw jobsError;

      // Get existing payout records to exclude already paid jobs
      const { data: existingPayouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('job_ids');

      if (payoutsError) throw payoutsError;

      // Flatten all paid job IDs
      const paidJobIds = new Set(
        existingPayouts?.flatMap(p => p.job_ids || []) || []
      );

      // Filter to only unpaid jobs
      const unpaidJobs = jobs?.filter(j => !paidJobIds.has(j.id)) || [];

      // Group by provider
      const providerMap = new Map<string, { amount: number; count: number }>();
      unpaidJobs.forEach(job => {
        if (!job.accepted_provider_id) return;
        const payout = job.provider_payout || (job.final_price || job.base_price) * 0.7;
        const current = providerMap.get(job.accepted_provider_id) || { amount: 0, count: 0 };
        providerMap.set(job.accepted_provider_id, {
          amount: current.amount + payout,
          count: current.count + 1,
        });
      });

      // Get provider details and banking info
      const providerIds = Array.from(providerMap.keys());
      
      if (providerIds.length === 0) {
        setProviderPayouts([]);
        setLoadingPayouts(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name')
        .in('id', providerIds);

      const { data: bankingData } = await supabase
        .from('provider_banking_details')
        .select('*')
        .in('provider_id', providerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const bankingMap = new Map(bankingData?.map(b => [b.provider_id, b]) || []);

      const payouts: ProviderPayout[] = providerIds.map(providerId => {
        const profile = profileMap.get(providerId);
        const banking = bankingMap.get(providerId);
        const { amount, count } = providerMap.get(providerId)!;

        return {
          provider_id: providerId,
          provider_name: profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          pending_amount: amount,
          jobs_count: count,
          banking: banking as BankingDetails | null,
        };
      });

      // Sort by pending amount descending
      payouts.sort((a, b) => b.pending_amount - a.pending_amount);
      setProviderPayouts(payouts);
    } catch (error) {
      console.error('Failed to load provider payouts:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const handleViewDetails = (record: BankingDetails) => {
    setSelectedRecord(record);
    setAdminNotes(record.admin_notes || '');
    setViewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRecord || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('provider_banking_details')
        .update({
          status: 'verified',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes.trim() || null,
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'approve_banking',
        entity_type: 'provider_banking_details',
        entity_id: selectedRecord.id,
        details: {
          provider_id: selectedRecord.provider_id,
          provider_name: selectedRecord.provider_name,
          bank_name: selectedRecord.bank_name,
        },
      });

      toast.success('Banking details verified successfully');
      setViewDialogOpen(false);
      setSelectedRecord(null);
      loadBankingRecords();
      loadProviderPayouts();
    } catch (error) {
      toast.error('Failed to approve banking details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !adminNotes.trim() || !user) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('provider_banking_details')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes.trim(),
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'reject_banking',
        entity_type: 'provider_banking_details',
        entity_id: selectedRecord.id,
        details: {
          provider_id: selectedRecord.provider_id,
          provider_name: selectedRecord.provider_name,
          rejection_reason: adminNotes.trim(),
        },
      });

      toast.success('Banking details rejected');
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedRecord(null);
      setAdminNotes('');
      loadBankingRecords();
    } catch (error) {
      toast.error('Failed to reject banking details');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: BankingStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'verified':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    }
  };

  const getBankName = (bank: string) => {
    return bank === 'scotiabank_jamaica' ? 'Scotiabank Jamaica' : 'NCB Jamaica';
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Calculate next payout dates (biweekly on Saturdays)
  const getPayoutDates = () => {
    const today = startOfDay(new Date());
    let nextPayout = nextSaturday(today);
    
    // Biweekly logic - check if this Saturday is a payout week
    // Using a reference date to determine payout weeks
    const referenceDate = new Date('2024-01-06'); // A known payout Saturday
    const weeksSinceReference = Math.floor((nextPayout.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksSinceReference % 2 !== 0) {
      nextPayout = addWeeks(nextPayout, 1);
    }
    
    return {
      nextPayout,
      followingPayout: addWeeks(nextPayout, 2),
      thirdPayout: addWeeks(nextPayout, 4),
    };
  };

  const payoutDates = getPayoutDates();

  const handleViewPayout = (payout: ProviderPayout) => {
    setSelectedPayout(payout);
    setPayoutDialogOpen(true);
  };

  const exportPayoutsToCSV = () => {
    if (providerPayouts.length === 0) {
      toast.error('No payout data to export');
      return;
    }

    const headers = [
      'Provider Name',
      'Pending Amount (JMD)',
      'Jobs Count',
      'Banking Status',
      'Beneficiary Name',
      'Bank Name',
      'Branch Name',
      'Account Number',
      'Account Type',
      'TRN'
    ];

    const rows = providerPayouts.map(payout => [
      payout.provider_name,
      payout.pending_amount.toFixed(2),
      payout.jobs_count.toString(),
      payout.banking?.status || 'Not submitted',
      payout.banking?.full_legal_name || '',
      payout.banking ? getBankName(payout.banking.bank_name) : '',
      payout.banking?.branch_name || '',
      payout.banking?.account_number || '',
      payout.banking?.account_type || '',
      payout.banking?.trn || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `provider-payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Payout data exported successfully');
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

  const pendingRecords = bankingRecords.filter(r => r.status === 'pending');
  const reviewedRecords = bankingRecords.filter(r => r.status !== 'pending');
  const verifiedRecords = bankingRecords.filter(r => r.status === 'verified');

  const totalPendingPayout = providerPayouts.reduce((sum, p) => sum + p.pending_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Provider Banking</h1>
              <p className="text-muted-foreground">Manage provider banking verification and payouts</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="verification" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="verification" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Verification
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pending Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{pendingRecords.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Verified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{verifiedRecords.length}</p>
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
                  <p className="text-3xl font-bold">{bankingRecords.filter(r => r.status === 'rejected').length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Pending Banking Verifications
                </CardTitle>
                <CardDescription>Banking details awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRecords.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No pending banking verifications. All caught up!</AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>TRN</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {format(new Date(record.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{record.provider_name}</TableCell>
                          <TableCell>{getBankName(record.bank_name)}</TableCell>
                          <TableCell>{record.trn}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleViewDetails(record)}>
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

            {/* Reviewed Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reviewed Banking Details
                </CardTitle>
                <CardDescription>Previously reviewed submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewedRecords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No reviewed banking details yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {format(new Date(record.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.reviewed_at && format(new Date(record.reviewed_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{record.provider_name}</TableCell>
                          <TableCell>{getBankName(record.bank_name)}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(record)}>
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
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {/* Payout Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Payout Schedule
                </CardTitle>
                <CardDescription>Biweekly payouts processed every other Saturday</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Next Payout</p>
                    <p className="text-xl font-bold text-primary">{format(payoutDates.nextPayout, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Following Payout</p>
                    <p className="text-lg font-semibold">{format(payoutDates.followingPayout, 'MMMM d, yyyy')}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Third Payout</p>
                    <p className="text-lg font-semibold">{format(payoutDates.thirdPayout, 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Total Pending Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">J${totalPendingPayout.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Providers with Banking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{providerPayouts.filter(p => p.banking?.status === 'verified').length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Missing Banking Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{providerPayouts.filter(p => !p.banking || p.banking.status !== 'verified').length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Provider Payouts List */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Provider Pending Payouts
                  </CardTitle>
                  <CardDescription>Click a provider to see full banking details for payment</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportPayoutsToCSV}
                  disabled={providerPayouts.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPayouts ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : providerPayouts.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No pending payouts at this time.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {providerPayouts.map((payout) => (
                      <div
                        key={payout.provider_id}
                        onClick={() => handleViewPayout(payout)}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{payout.provider_name}</p>
                          <p className="text-sm text-muted-foreground">{payout.jobs_count} job{payout.jobs_count !== 1 ? 's' : ''} completed</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">J${payout.pending_amount.toLocaleString()}</p>
                            {payout.banking?.status === 'verified' ? (
                              <p className="text-sm text-muted-foreground">{getBankName(payout.banking.bank_name)}</p>
                            ) : (
                              <Badge variant="outline" className="text-warning gap-1">
                                <AlertTriangle className="h-3 w-3" /> No verified banking
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Banking Details</DialogTitle>
            <DialogDescription>
              {selectedRecord && `${selectedRecord.provider_name} - ${getBankName(selectedRecord.bank_name)}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Legal Name</Label>
                  <p className="font-medium">{selectedRecord.full_legal_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bank</Label>
                  <p className="font-medium">{getBankName(selectedRecord.bank_name)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Branch Name</Label>
                  <p className="font-medium">{selectedRecord.branch_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Branch Number</Label>
                  <p className="font-medium">{selectedRecord.branch_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Account Number</Label>
                  <p className="font-medium font-mono">{selectedRecord.account_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Account Type</Label>
                  <p className="font-medium capitalize">{selectedRecord.account_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">TRN</Label>
                  <p className="font-medium font-mono">{selectedRecord.trn}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
              </div>

              {selectedRecord.status === 'pending' && (
                <div className="space-y-2">
                  <Label>Admin Notes (required for rejection)</Label>
                  <Textarea
                    placeholder="Add notes about this verification..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {selectedRecord.status !== 'pending' && selectedRecord.admin_notes && (
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selectedRecord.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRecord?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button 
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Verify
                </Button>
              </>
            )}
            {selectedRecord?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this banking verification? The provider will need to resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {adminNotes.trim() 
                  ? `Reason: ${adminNotes}`
                  : 'Please add a rejection reason in the notes field before rejecting.'}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!adminNotes.trim() || submitting}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Details Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Full banking information for {selectedPayout?.provider_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-6">
              {/* Amount Due */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Amount to Pay</p>
                <p className="text-3xl font-bold text-primary">J${selectedPayout.pending_amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedPayout.jobs_count} completed job{selectedPayout.jobs_count !== 1 ? 's' : ''}</p>
              </div>

              {selectedPayout.banking?.status === 'verified' ? (
                <div className="space-y-3">
                  {/* Beneficiary Name */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Beneficiary Name</p>
                      <p className="font-semibold">{selectedPayout.banking.full_legal_name}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(selectedPayout.banking!.full_legal_name, 'Beneficiary name')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Bank Name */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Bank</p>
                      <p className="font-semibold">{getBankName(selectedPayout.banking.bank_name)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(getBankName(selectedPayout.banking!.bank_name), 'Bank name')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Branch */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <p className="font-semibold">{selectedPayout.banking.branch_name}</p>
                      {selectedPayout.banking.branch_number && (
                        <p className="text-sm text-muted-foreground">#{selectedPayout.banking.branch_number}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(selectedPayout.banking!.branch_name, 'Branch name')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-mono text-lg font-bold tracking-wider">{selectedPayout.banking.account_number}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(selectedPayout.banking!.account_number, 'Account number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Account Type */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Type</p>
                      <p className="font-semibold capitalize">{selectedPayout.banking.account_type}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(selectedPayout.banking!.account_type, 'Account type')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* TRN */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">TRN</p>
                      <p className="font-mono font-semibold">{selectedPayout.banking.trn}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(selectedPayout.banking!.trn, 'TRN')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Next Payout Date */}
                  <div className="p-3 border border-dashed rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Next Scheduled Payout</p>
                    <p className="font-semibold text-primary">{format(payoutDates.nextPayout, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This provider does not have verified banking details. They must submit and get their banking information verified before they can receive payouts.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
