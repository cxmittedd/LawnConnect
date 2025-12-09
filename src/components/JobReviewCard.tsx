import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendNotification } from '@/lib/notifications';

interface JobReviewCardProps {
  jobId: string;
  jobTitle: string;
  customerId: string;
  providerId: string;
  customerName: string;
  providerName: string;
  isCustomer: boolean;
  isProvider: boolean;
  onReviewSubmit: () => void;
}

interface Review {
  id: string;
  rating: number;
  reviewer_id: string;
  reviewee_id: string;
  created_at: string | null;
}

export function JobReviewCard({
  jobId,
  jobTitle,
  customerId,
  providerId,
  customerName,
  providerName,
  isCustomer,
  isProvider,
  onReviewSubmit,
}: JobReviewCardProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const currentUserId = isCustomer ? customerId : providerId;
  const otherUserId = isCustomer ? providerId : customerId;
  const otherUserName = isCustomer ? providerName : customerName;

  const hasSubmittedReview = reviews.some(r => r.reviewer_id === currentUserId);
  const myReview = reviews.find(r => r.reviewer_id === currentUserId);
  const theirReview = reviews.find(r => r.reviewee_id === currentUserId);

  useEffect(() => {
    loadReviews();
  }, [jobId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: jobId,
          reviewer_id: currentUserId,
          reviewee_id: otherUserId,
          rating,
        });

      if (error) throw error;

      // Notify the reviewee about the new review
      sendNotification({
        type: 'review_received',
        recipientId: otherUserId,
        jobTitle,
        jobId,
        additionalData: { rating },
      });

      toast.success('Review submitted successfully!');
      setRating(0);
      loadReviews();
      onReviewSubmit();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (interactive ? (hoverRating || value) : value)
                  ? 'fill-warning text-warning'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Reviews
        </CardTitle>
        <CardDescription>
          Share your experience with this job
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review received from the other party */}
        {theirReview && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Review from {otherUserName}
              </span>
              {theirReview.created_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(theirReview.created_at), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            {renderStars(theirReview.rating)}
          </div>
        )}

        {/* My submitted review */}
        {myReview && (
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Your review</span>
              {myReview.created_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(myReview.created_at), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            {renderStars(myReview.rating)}
          </div>
        )}

        {/* Review form if not submitted */}
        {!hasSubmittedReview && (
          <div className="space-y-4">
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                How was your experience with {otherUserName}? Your feedback helps build trust in the LawnConnect community.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Rating</Label>
              {renderStars(rating, true)}
            </div>

            <Button
              onClick={handleSubmitReview}
              disabled={submitting || rating === 0}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        )}

        {/* No reviews yet message */}
        {reviews.length === 0 && hasSubmittedReview === false && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Be the first to leave a review!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
