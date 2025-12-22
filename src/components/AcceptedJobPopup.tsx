import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewlyAcceptedJobs } from '@/hooks/useNewlyAcceptedJobs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function AcceptedJobPopup() {
  const navigate = useNavigate();
  const { newlyAcceptedJobs, dismissJob, loading } = useNewlyAcceptedJobs();
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Show popup when newly accepted jobs are detected
  useEffect(() => {
    if (!loading && newlyAcceptedJobs.length > 0 && !hasShown) {
      setOpen(true);
      setHasShown(true);
    }
  }, [newlyAcceptedJobs, loading, hasShown]);

  const currentJob = newlyAcceptedJobs[currentJobIndex];

  const handleViewJob = () => {
    if (currentJob) {
      dismissJob(currentJob.id);
      setOpen(false);
      navigate(`/job/${currentJob.id}`);
    }
  };

  const handleDismiss = () => {
    if (currentJob) {
      dismissJob(currentJob.id);
      if (currentJobIndex < newlyAcceptedJobs.length - 1) {
        setCurrentJobIndex(prev => prev + 1);
      } else {
        setOpen(false);
      }
    }
  };

  const handleDismissAll = () => {
    newlyAcceptedJobs.forEach(job => dismissJob(job.id));
    setOpen(false);
  };

  if (!currentJob) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10 w-fit">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-xl">Job Accepted!</DialogTitle>
          <DialogDescription className="text-base">
            Great news! Your job "{currentJob.title}" was accepted by{' '}
            <span className="font-medium text-foreground">{currentJob.providerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleViewJob} className="gap-2">
            View Job Details
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          {newlyAcceptedJobs.length > 1 ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDismiss} className="flex-1">
                Next ({newlyAcceptedJobs.length - 1} more)
              </Button>
              <Button variant="ghost" onClick={handleDismissAll} className="flex-1">
                Dismiss All
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
