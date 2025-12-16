import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Clock, ArrowLeft, User, Star, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { TestPaymentCard } from '@/components/TestPaymentCard';
import { JobCompletionCard } from '@/components/JobCompletionCard';
import { JobReviewCard } from '@/components/JobReviewCard';
import { JobChat } from '@/components/JobChat';

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
  platform_fee: number | null;
  status: string;
  payment_status: string | null;
  payment_reference: string | null;
  customer_id: string;
  accepted_provider_id: string | null;
  created_at: string;
  provider_completed_at: string | null;
  completed_at: string | null;
}

interface ProviderInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

      // Load provider info if job has accepted provider
      if (jobData.accepted_provider_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .eq('id', jobData.accepted_provider_id)
          .maybeSingle();

        // Fetch reviews for rating calculation
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', jobData.accepted_provider_id);

        const reviewCount = reviews?.length || 0;
        const avgRating = reviewCount > 0
          ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : null;

        if (profile) {
          setProviderInfo({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            rating: avgRating,
            review_count: reviewCount,
          });
        }
      }
    } catch (error) {
      safeToast.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job || !user) return;

    setCancelling(true);
    try {
      // Update job status to cancelled and payment to refunded
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'cancelled',
          payment_status: 'refunded',
        })
        .eq('id', job.id)
        .eq('customer_id', user.id)
        .is('accepted_provider_id', null); // Only allow cancellation if no provider assigned

      if (error) throw error;

      toast.success('Job cancelled successfully. Your payment will be refunded.');
      setCancelDialogOpen(false);
      navigate('/my-jobs');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-info text-info-foreground';
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
  const canCancelJob = isCustomer && job?.status === 'open' && !job?.accepted_provider_id;
  const showPaymentCard = job?.status === 'accepted' || job?.status === 'in_progress' || job?.status === 'pending_completion' || job?.status === 'completed';
  const showCompletionCard = (job?.status === 'accepted' || job?.status === 'in_progress' || job?.status === 'pending_completion' || job?.status === 'completed') && job?.payment_status === 'paid';
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
                      <div className="text-sm text-muted-foreground">{isProvider ? 'Your Earnings' : 'Job Price'}</div>
                      <div className="text-xl font-bold text-primary flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        J${isProvider 
                          ? ((job.final_price || job.base_price) * 0.70).toFixed(2)
                          : (job.final_price || job.base_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Card - shown after job accepted */}
            {showPaymentCard && providerInfo && job.final_price && job.accepted_provider_id && (
              <TestPaymentCard
                jobId={job.id}
                jobTitle={job.title}
                amount={job.final_price}
                providerId={job.accepted_provider_id}
                customerId={job.customer_id}
                providerName={providerInfo.full_name || 'Provider'}
                paymentStatus={job.payment_status || 'pending'}
                isCustomer={isCustomer}
                isProvider={isProvider}
                jobLocation={job.location}
                parish={job.parish}
                lawnSize={job.lawn_size}
                platformFee={job.platform_fee || undefined}
                onPaymentUpdate={loadJobDetails}
              />
            )}

            {/* Job Completion Card - shown after payment confirmed */}
            {showCompletionCard && providerInfo && (
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
                providerName={providerInfo.full_name || 'Provider'}
                customerName={customerName}
                preferredDate={job.preferred_date}
                finalPrice={job.final_price}
                onStatusUpdate={loadJobDetails}
              />
            )}

            {/* Reviews Card - shown for completed jobs */}
            {showReviewCard && providerInfo && job.accepted_provider_id && (
              <JobReviewCard
                jobId={job.id}
                jobTitle={job.title}
                customerId={job.customer_id}
                providerId={job.accepted_provider_id}
                customerName={customerName}
                providerName={providerInfo.full_name || 'Provider'}
                isCustomer={isCustomer}
                isProvider={isProvider}
                onReviewSubmit={loadJobDetails}
              />
            )}

            {/* Chat - shown when provider is accepted but job not completed */}
            {job.accepted_provider_id && (isCustomer || isProvider) && job.status !== 'completed' && (
              <JobChat
                jobId={job.id}
                customerId={job.customer_id}
                providerId={job.accepted_provider_id}
                isCustomer={isCustomer}
              />
            )}
          </div>

          {/* Provider Sidebar */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {job.accepted_provider_id ? 'Assigned Provider' : 'Provider Status'}
            </h2>

            {!job.accepted_provider_id ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Waiting for provider</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A provider will confirm this job soon
                  </p>
                  {canCancelJob && (
                    <Button
                      variant="destructive"
                      className="mt-4"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Job
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : providerInfo && (
              <Card className="border-success">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      {providerInfo.avatar_url && (
                        <AvatarImage src={providerInfo.avatar_url} alt={providerInfo.full_name || 'Provider'} />
                      )}
                      <AvatarFallback>
                        {providerInfo.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <button
                            onClick={() => navigate(`/provider/${providerInfo.id}`)}
                            className="font-semibold hover:text-primary hover:underline text-left"
                          >
                            {providerInfo.full_name || 'Provider'}
                          </button>
                          {providerInfo.rating !== null && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                              <span className="text-sm font-medium">{providerInfo.rating.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">
                                ({providerInfo.review_count} {providerInfo.review_count === 1 ? 'review' : 'reviews'})
                              </span>
                            </div>
                          )}
                          {providerInfo.rating === null && (
                            <span className="text-xs text-muted-foreground mt-1">No reviews yet</span>
                          )}
                          {providerInfo.bio && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                              {providerInfo.bio}
                            </p>
                          )}
                        </div>
                        <Badge variant="default">Assigned</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Cancel Job Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Job</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this job?
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Since no provider has been assigned yet, you will receive a full refund of{' '}
                <span className="font-semibold text-primary">
                  J${(job.final_price || job.base_price).toFixed(2)}
                </span>
                . This action cannot be undone.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep Job
              </Button>
              <Button variant="destructive" onClick={handleCancelJob} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel Job & Get Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
