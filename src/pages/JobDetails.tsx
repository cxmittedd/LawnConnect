import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Clock, ArrowLeft, Check, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TestPaymentCard } from '@/components/TestPaymentCard';
import { JobCompletionCard } from '@/components/JobCompletionCard';
import { JobReviewCard } from '@/components/JobReviewCard';
import { JobChat } from '@/components/JobChat';
import { sendNotification } from '@/lib/notifications';

interface JobDetails {
  id: string;
  title: string;
  description: string | null;
  location: string;
  parish: string;
  lawn_size: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  additional_requirements: string | null;
  base_price: number;
  customer_offer: number | null;
  final_price: number | null;
  status: string;
  payment_status: string | null;
  payment_reference: string | null;
  customer_id: string;
  accepted_provider_id: string | null;
  created_at: string;
  provider_completed_at: string | null;
  completed_at: string | null;
}

interface Proposal {
  id: string;
  proposed_price: number;
  message: string | null;
  status: string | null;
  created_at: string | null;
  provider_id: string;
  provider_name: string | null;
  provider_avatar: string | null;
  provider_bio: string | null;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });

  useEffect(() => {
    if (id) loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    if (!id) return;

    try {
      // Load job details
      const { data: jobData, error: jobError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!jobData) {
        toast.error('Job not found');
        navigate('/my-jobs');
        return;
      }

      setJob(jobData);

      // Fetch customer profile for name
      if (jobData.customer_id) {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', jobData.customer_id)
          .maybeSingle();
        
        if (customerProfile?.full_name) {
          setCustomerName(customerProfile.full_name);
        }
      }

      // Load proposals with provider info
      const { data: proposalData, error: proposalError } = await supabase
        .from('job_proposals')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: false });

      if (proposalError) throw proposalError;

      // Fetch provider profiles separately
      if (proposalData && proposalData.length > 0) {
        const providerIds = proposalData.map(p => p.provider_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', providerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedProposals = proposalData.map(proposal => ({
          ...proposal,
          provider_name: profileMap.get(proposal.provider_id)?.full_name || null,
          provider_avatar: profileMap.get(proposal.provider_id)?.avatar_url || null,
          provider_bio: profileMap.get(proposal.provider_id)?.bio || null,
        }));

        setProposals(enrichedProposals);
      } else {
        setProposals([]);
      }
    } catch (error: any) {
      toast.error('Failed to load job details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProposal = async (proposal: Proposal) => {
    setConfirmDialog({ open: true, proposal });
  };

  const confirmAcceptProposal = async () => {
    const proposal = confirmDialog.proposal;
    if (!proposal || !job) return;

    setAcceptingId(proposal.id);

    try {
      // Calculate platform fee (10%) and provider payout (90%)
      const platformFee = proposal.proposed_price * 0.10;
      const providerPayout = proposal.proposed_price * 0.90;

      // Update the job with accepted provider and final price
      const { error: jobError } = await supabase
        .from('job_requests')
        .update({
          status: 'accepted',
          accepted_provider_id: proposal.provider_id,
          final_price: proposal.proposed_price,
          platform_fee: platformFee,
          provider_payout: providerPayout,
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      // Update accepted proposal status
      const { error: acceptError } = await supabase
        .from('job_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposal.id);

      if (acceptError) throw acceptError;

      // Reject other proposals for this job
      const { error: rejectError } = await supabase
        .from('job_proposals')
        .update({ status: 'rejected' })
        .eq('job_id', job.id)
        .neq('id', proposal.id);

      if (rejectError) throw rejectError;

      // Send notification to provider
      sendNotification({
        type: 'proposal_accepted',
        recipientId: proposal.provider_id,
        jobTitle: job.title,
        jobId: job.id,
        additionalData: {
          customerName: customerName,
          amount: proposal.proposed_price,
        },
      });

      toast.success('Proposal accepted! The provider will be notified.');
      setConfirmDialog({ open: false, proposal: null });
      loadJobDetails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept proposal');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('job_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      if (error) throw error;

      toast.success('Proposal rejected');
      loadJobDetails();
    } catch (error: any) {
      toast.error('Failed to reject proposal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-info text-info-foreground';
      case 'in_negotiation':
        return 'bg-warning text-warning-foreground';
      case 'accepted':
      case 'in_progress':
        return 'bg-primary text-primary-foreground';
      case 'pending_completion':
        return 'bg-warning text-warning-foreground';
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const isCustomer = job?.customer_id === user?.id;
  const isProvider = job?.accepted_provider_id === user?.id;
  const acceptedProposal = proposals.find(p => p.status === 'accepted');
  const showPaymentCard = job?.status === 'accepted' || job?.status === 'in_progress' || job?.status === 'pending_completion' || job?.status === 'completed';
  const showCompletionCard = (job?.status === 'in_progress' || job?.status === 'pending_completion' || job?.status === 'completed') && job?.payment_status === 'paid';
  const showReviewCard = job?.status === 'completed';

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading job details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Job not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/my-jobs')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Jobs
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />
                      {job.location}, {job.parish}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(job.status)}>
                    {getStatusLabel(job.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {job.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{job.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {job.lawn_size && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Lawn Size</h4>
                      <p>{job.lawn_size}</p>
                    </div>
                  )}
                  {job.preferred_date && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Preferred Date</h4>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(job.preferred_date), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {job.preferred_time && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Preferred Time</h4>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {job.preferred_time}
                      </p>
                    </div>
                  )}
                </div>

                {job.additional_requirements && (
                  <div>
                    <h3 className="font-semibold mb-2">Additional Requirements</h3>
                    <p className="text-muted-foreground">{job.additional_requirements}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-8">
                    <div>
                      <div className="text-sm text-muted-foreground">Base Price</div>
                      <div className="text-xl font-bold flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        J${job.base_price.toFixed(2)}
                      </div>
                    </div>
                    {job.customer_offer && job.customer_offer !== job.base_price && (
                      <div>
                        <div className="text-sm text-muted-foreground">Customer Offer</div>
                        <div className="text-xl font-bold text-primary flex items-center gap-1">
                          <DollarSign className="h-5 w-5" />
                          J${job.customer_offer.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {job.final_price && (
                      <div>
                        <div className="text-sm text-muted-foreground">Final Price</div>
                        <div className="text-xl font-bold text-success flex items-center gap-1">
                          <DollarSign className="h-5 w-5" />
                          J${job.final_price.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Card - shown after proposal accepted */}
            {showPaymentCard && acceptedProposal && job.final_price && job.accepted_provider_id && (
              <TestPaymentCard
                jobId={job.id}
                jobTitle={job.title}
                amount={job.final_price}
                providerId={job.accepted_provider_id}
                customerId={job.customer_id}
                providerName={acceptedProposal.provider_name || 'Provider'}
                paymentStatus={job.payment_status || 'pending'}
                isCustomer={isCustomer}
                isProvider={isProvider}
                onPaymentUpdate={loadJobDetails}
              />
            )}

            {/* Job Completion Card - shown after payment confirmed */}
            {showCompletionCard && acceptedProposal && (
              <JobCompletionCard
                jobId={job.id}
                jobTitle={job.title}
                customerId={job.customer_id}
                providerId={job.accepted_provider_id!}
                status={job.status}
                providerCompletedAt={job.provider_completed_at}
                completedAt={job.completed_at}
                isCustomer={isCustomer}
                isProvider={isProvider}
                providerName={acceptedProposal.provider_name || 'Provider'}
                onStatusUpdate={loadJobDetails}
              />
            )}

            {/* Reviews Card - shown for completed jobs */}
            {showReviewCard && acceptedProposal && job.accepted_provider_id && (
              <JobReviewCard
                jobId={job.id}
                jobTitle={job.title}
                customerId={job.customer_id}
                providerId={job.accepted_provider_id}
                customerName={customerName}
                providerName={acceptedProposal.provider_name || 'Provider'}
                isCustomer={isCustomer}
                isProvider={isProvider}
                onReviewSubmit={loadJobDetails}
              />
            )}

            {/* Chat - shown when provider is accepted */}
            {job.accepted_provider_id && (isCustomer || isProvider) && (
              <JobChat
                jobId={job.id}
                customerId={job.customer_id}
                providerId={job.accepted_provider_id}
                isCustomer={isCustomer}
              />
            )}
          </div>

          {/* Proposals Sidebar */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Proposals ({proposals.length})
            </h2>

            {proposals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No proposals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Providers will submit proposals soon
                  </p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <Card key={proposal.id} className={proposal.status === 'accepted' ? 'border-success' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        {proposal.provider_avatar && (
                          <AvatarImage src={proposal.provider_avatar} alt={proposal.provider_name || 'Provider'} />
                        )}
                        <AvatarFallback>
                          {proposal.provider_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <button
                              onClick={() => navigate(`/provider/${proposal.provider_id}`)}
                              className="font-semibold hover:text-primary hover:underline text-left"
                            >
                              {proposal.provider_name || 'Provider'}
                            </button>
                            {proposal.provider_bio && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {proposal.provider_bio}
                              </p>
                            )}
                          </div>
                          {proposal.status && proposal.status !== 'pending' && (
                            <Badge variant={proposal.status === 'accepted' ? 'default' : 'secondary'}>
                              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-2xl font-bold text-primary">
                            J${proposal.proposed_price.toFixed(2)}
                          </div>
                        </div>

                        {proposal.message && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                            {proposal.message}
                          </p>
                        )}

                        {proposal.created_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted {format(new Date(proposal.created_at), 'MMM dd, yyyy')}
                          </p>
                        )}

                        {isCustomer && job.status === 'open' && proposal.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptProposal(proposal)}
                              disabled={acceptingId === proposal.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectProposal(proposal.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, proposal: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Proposal</DialogTitle>
              <DialogDescription>
                Are you sure you want to accept this proposal for{' '}
                <span className="font-semibold text-primary">
                  J${confirmDialog.proposal?.proposed_price.toFixed(2)}
                </span>
                ? This will assign the job to {confirmDialog.proposal?.provider_name || 'this provider'}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, proposal: null })}>
                Cancel
              </Button>
              <Button onClick={confirmAcceptProposal} disabled={!!acceptingId}>
                {acceptingId ? 'Accepting...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
