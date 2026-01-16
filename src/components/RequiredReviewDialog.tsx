import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';

interface PendingReview {
  jobId: string;
  jobTitle: string;
  otherPartyId: string;
  otherPartyName: string;
  completedAt: string;
  isCustomer: boolean;
}

interface RequiredReviewDialogProps {
  open: boolean;
  pendingReviews: PendingReview[];
  onReviewsComplete: () => void;
}

export function RequiredReviewDialog({
  open,
  pendingReviews,
  onReviewsComplete,
}: RequiredReviewDialogProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const currentReview = pendingReviews[currentIndex];
  const isLastReview = currentIndex === pendingReviews.length - 1;

  const handleSubmitReview = async () => {
    if (!user || !currentReview || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: currentReview.jobId,
          reviewer_id: user.id,
          reviewee_id: currentReview.otherPartyId,
          rating,
        });

      if (error) throw error;

      // Notify the reviewee
      sendNotification({
        type: 'review_received',
        recipientId: currentReview.otherPartyId,
        jobTitle: currentReview.jobTitle,
        jobId: currentReview.jobId,
        additionalData: { rating },
      });

      toast.success('Review submitted!');
      setRating(0);

      if (isLastReview) {
        onReviewsComplete();
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentReview) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Review Required
          </DialogTitle>
          <DialogDescription>
            Please leave a review before continuing. Reviews help build trust in the LawnConnect community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {currentIndex + 1} of {pendingReviews.length} reviews
            </p>
            <h3 className="font-semibold text-lg">{currentReview.jobTitle}</h3>
            <p className="text-muted-foreground">
              How was your experience with {currentReview.otherPartyName}?
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="cursor-pointer hover:scale-110 transition-transform p-1"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoverRating || rating)
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmitReview}
            disabled={submitting || rating === 0}
            className="w-full"
            size="lg"
          >
            {submitting ? 'Submitting...' : isLastReview ? 'Submit & Continue' : 'Submit & Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
