import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, Flag, PartyPopper, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendNotification } from '@/lib/notifications';

interface JobCompletionCardProps {
  jobId: string;
  jobTitle: string;
  customerId: string;
  status: string;
  providerCompletedAt: string | null;
  completedAt: string | null;
  isCustomer: boolean;
  isProvider: boolean;
  providerName: string;
  onStatusUpdate: () => void;
}

export function JobCompletionCard({
  jobId,
  jobTitle,
  customerId,
  status,
  providerCompletedAt,
  completedAt,
  isCustomer,
  isProvider,
  providerName,
  onStatusUpdate,
}: JobCompletionCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [providerCompleteDialog, setProviderCompleteDialog] = useState(false);
  const [customerConfirmDialog, setCustomerConfirmDialog] = useState(false);

  const handleProviderMarkComplete = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          provider_completed_at: new Date().toISOString(),
          status: 'pending_completion',
        })
        .eq('id', jobId);

      if (error) throw error;

      // Notify customer that provider marked job complete
      sendNotification({
        type: 'job_completed',
        recipientId: customerId,
        jobTitle,
        jobId,
      });

      toast.success('Job marked as complete! Waiting for customer confirmation.');
      setProviderCompleteDialog(false);
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark job as complete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerConfirmCompletion = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job completed! Thank you for using LawnConnect.');
      setCustomerConfirmDialog(false);
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm job completion');
    } finally {
      setSubmitting(false);
    }
  };

  // Only show for in_progress or pending_completion jobs
  if (status !== 'in_progress' && status !== 'pending_completion' && status !== 'completed') {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Job Completion
              </CardTitle>
              <CardDescription>
                {status === 'completed' 
                  ? 'This job has been completed'
                  : status === 'pending_completion'
                  ? 'Awaiting customer confirmation'
                  : 'Mark job as complete when finished'}
              </CardDescription>
            </div>
            {status === 'in_progress' && (
              <Badge className="bg-info text-info-foreground gap-1">
                <Clock className="h-3 w-3" /> In Progress
              </Badge>
            )}
            {status === 'pending_completion' && (
              <Badge className="bg-warning text-warning-foreground gap-1">
                <Clock className="h-3 w-3" /> Pending Confirmation
              </Badge>
            )}
            {status === 'completed' && (
              <Badge className="bg-success text-success-foreground gap-1">
                <CheckCircle className="h-3 w-3" /> Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider View - In Progress */}
          {isProvider && status === 'in_progress' && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Job is in progress</strong>
                  <p className="mt-1 text-sm">
                    Once you've completed the lawn service, mark the job as complete. The customer will then confirm completion to finalize the transaction.
                  </p>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => setProviderCompleteDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Job as Complete
              </Button>
            </div>
          )}

          {/* Provider View - Pending Completion */}
          {isProvider && status === 'pending_completion' && (
            <Alert className="border-warning/50 bg-warning/10">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Awaiting customer confirmation</strong>
                <p className="mt-1 text-sm">
                  You marked this job complete on{' '}
                  {providerCompletedAt && format(new Date(providerCompletedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                </p>
                <p className="mt-1 text-sm">
                  The customer needs to confirm the work is satisfactory before the job is finalized.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Provider View - Completed */}
          {isProvider && status === 'completed' && (
            <Alert className="border-success/50 bg-success/10">
              <PartyPopper className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>Job completed!</strong>
                <p className="mt-1 text-sm">
                  The customer confirmed completion on{' '}
                  {completedAt && format(new Date(completedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                </p>
                <p className="mt-2 text-sm flex items-center gap-1">
                  <Star className="h-3 w-3" /> Don't forget to leave a review for the customer!
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer View - In Progress */}
          {isCustomer && status === 'in_progress' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Job in progress</strong>
                <p className="mt-1 text-sm">
                  {providerName} is working on your lawn. Once they finish, they'll mark the job as complete and you'll be asked to confirm.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer View - Pending Completion */}
          {isCustomer && status === 'pending_completion' && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{providerName} has marked the job as complete!</strong>
                  <p className="mt-1 text-sm">
                    Completed on{' '}
                    {providerCompletedAt && format(new Date(providerCompletedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                  </p>
                  <p className="mt-1 text-sm">
                    Please review the work and confirm completion if you're satisfied.
                  </p>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => setCustomerConfirmDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Job Completion
              </Button>
            </div>
          )}

          {/* Customer View - Completed */}
          {isCustomer && status === 'completed' && (
            <Alert className="border-success/50 bg-success/10">
              <PartyPopper className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>Job completed!</strong>
                <p className="mt-1 text-sm">
                  You confirmed completion on{' '}
                  {completedAt && format(new Date(completedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                </p>
                <p className="mt-2 text-sm flex items-center gap-1">
                  <Star className="h-3 w-3" /> Don't forget to leave a review for {providerName}!
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Provider Complete Dialog */}
      <Dialog open={providerCompleteDialog} onOpenChange={setProviderCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Job as Complete</DialogTitle>
            <DialogDescription>
              Are you sure you've finished the lawn service? The customer will be notified to confirm the work is satisfactory.
              <br /><br />
              Once confirmed by the customer, the job will be finalized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleProviderMarkComplete} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Yes, Job is Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Confirm Dialog */}
      <Dialog open={customerConfirmDialog} onOpenChange={setCustomerConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Job Completion</DialogTitle>
            <DialogDescription>
              Are you satisfied with the lawn service provided by {providerName}?
              <br /><br />
              By confirming, you acknowledge that the work has been completed to your satisfaction.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomerConfirmCompletion} disabled={submitting}>
              {submitting ? 'Confirming...' : 'Yes, I\'m Satisfied'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
