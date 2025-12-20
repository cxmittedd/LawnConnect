import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Scissors, Shield, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { useProviderVerification } from '@/hooks/useProviderVerification';
import { useProviderProfileCompletion } from '@/hooks/useProviderProfileCompletion';
import { ProfileCompletionDialog } from '@/components/ProfileCompletionDialog';
import { sendNotification } from '@/lib/notifications';

interface Job {
  id: string;
  title: string;
  description: string | null;
  parish: string;
  location: string;
  lawn_size: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  additional_requirements: string | null;
  base_price: number;
  final_price: number | null;
  provider_payout: number | null;
  created_at: string;
}

export default function BrowseJobs() {
  const { user } = useAuth();
  const { isVerified, isPending, needsVerification, loading: verificationLoading } = useProviderVerification();
  const { isComplete, hasAvatar, hasBio, avatarUrl, bio, loading: profileLoading, refetch: refetchProfile } = useProviderProfileCompletion();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!verificationLoading && isVerified) {
      loadJobs();
    } else if (!verificationLoading) {
      setLoading(false);
    }
  }, [verificationLoading, isVerified]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_provider_job_listings');

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJob = (job: Job) => {
    // Check if profile is complete before allowing confirmation
    if (!isComplete) {
      setSelectedJob(job);
      setProfileDialogOpen(true);
      return;
    }

    setSelectedJob(job);
    setConfirmDialogOpen(true);
  };

  const handleProfileComplete = () => {
    refetchProfile();
    // After profile is complete, open the confirm dialog
    if (selectedJob) {
      setConfirmDialogOpen(true);
    }
  };

  const handleAcceptJob = async () => {
    if (!selectedJob || !user) return;

    setConfirming(true);

    try {
      // Use the pre-calculated values from when job was posted (includes job type extras)
      // Only update status and accepted_provider_id - pricing is already set at job creation
      const { data: jobData, error: jobError } = await supabase
        .from('job_requests')
        .update({
          status: 'accepted',
          accepted_provider_id: user.id,
        })
        .eq('id', selectedJob.id)
        .is('accepted_provider_id', null) // Only update if not already assigned
        .select('customer_id')
        .maybeSingle();

      if (jobError) throw jobError;

      if (!jobData?.customer_id) {
        toast.error('This job has already been taken by another provider');
        loadJobs();
        return;
      }

      // Send notification to customer
      if (jobData?.customer_id) {
        const { data: providerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        sendNotification({
          type: 'job_confirmed',
          recipientId: jobData.customer_id,
          jobTitle: selectedJob.title,
          jobId: selectedJob.id,
          additionalData: {
            providerName: providerProfile?.full_name || 'A provider',
          },
        });
      }

      toast.success('Job confirmed! You can now start working on this job.');
      setConfirmDialogOpen(false);
      setSelectedJob(null);
      loadJobs();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setConfirming(false);
    }
  };

  if (loading || verificationLoading || profileLoading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Show verification required message for unverified providers
  if (needsVerification) {
    return (
      <>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Browse Jobs</h1>
            <p className="text-muted-foreground">Find lawn cutting opportunities near you</p>
          </div>

          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-warning" />
              </div>
              <CardTitle>ID Verification Required</CardTitle>
              <CardDescription>
                {isPending 
                  ? 'Your ID verification is pending review'
                  : 'You must verify your identity to browse jobs'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPending ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your ID document is currently under review. This typically takes 1-2 business days.
                    You'll receive access to job listings once approved.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    To protect our customers and ensure trust on the platform, all service providers 
                    must verify their identity before accessing job listings.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button asChild className="w-full">
                <Link to="/profile">
                  {isPending ? 'View Verification Status' : 'Verify Your ID Now'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Browse Jobs</h1>
          <p className="text-muted-foreground">Find lawn cutting opportunities near you</p>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No jobs available at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <Card key={job.id} className="bg-card hover:shadow-lg transition-shadow border-border">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}, {job.parish}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Open</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {job.lawn_size && (
                      <Badge variant="secondary">{job.lawn_size}</Badge>
                    )}
                    {job.preferred_date && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(job.preferred_date), 'MMM dd')}
                      </Badge>
                    )}
                    {job.preferred_time && (
                      <Badge variant="outline">{job.preferred_time}</Badge>
                    )}
                  </div>

                  {job.additional_requirements && (
                    <div className="text-sm">
                      <span className="font-medium">Additional work:</span>{' '}
                      <span className="text-muted-foreground">{job.additional_requirements}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">Your Earnings</div>
                      <div className="text-2xl font-bold text-primary flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        J${(job.provider_payout || (job.final_price || job.base_price) * 0.70).toFixed(2)}
                      </div>
                    </div>
                    <Button onClick={() => handleConfirmJob(job)}>
                      Confirm Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Job</DialogTitle>
              <DialogDescription>
                Are you sure you want to take this job? Once confirmed, you will be assigned to complete it.
              </DialogDescription>
            </DialogHeader>
            {selectedJob && (
              <div className="py-4 space-y-3">
                <div>
                  <span className="font-medium">Job:</span> {selectedJob.title}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {selectedJob.location}, {selectedJob.parish}
                </div>
                {selectedJob.preferred_date && (
                  <>
                    <div>
                      <span className="font-medium">Preferred Date:</span>{' '}
                      {format(new Date(selectedJob.preferred_date), 'MMMM dd, yyyy')}
                    </div>
                    <div>
                      <span className="font-medium">Deadline:</span>{' '}
                      <span className="text-warning font-medium">
                        {format(new Date(new Date(selectedJob.preferred_date).setDate(new Date(selectedJob.preferred_date).getDate() + 1)), 'MMMM dd, yyyy')}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium">Your Earnings:</span>{' '}
                  <span className="text-primary font-bold">
                    J${(selectedJob.provider_payout || (selectedJob.final_price || selectedJob.base_price) * 0.70).toFixed(2)}
                  </span>
                </div>
                
                {selectedJob.preferred_date && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> You must complete this job by {format(new Date(new Date(selectedJob.preferred_date).setDate(new Date(selectedJob.preferred_date).getDate() + 1)), 'MMMM dd, yyyy')} (1 day after the preferred date). 
                      Completing after this deadline will add a dispute to your account for this month, which may affect your earnings.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAcceptJob} disabled={confirming}>
                {confirming ? 'Confirming...' : 'I Understand & Accept Job'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Completion Dialog */}
        <ProfileCompletionDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          hasAvatar={hasAvatar}
          hasBio={hasBio}
          currentAvatarUrl={avatarUrl}
          currentBio={bio}
          onComplete={handleProfileComplete}
        />
      </main>
    </>
  );
}
