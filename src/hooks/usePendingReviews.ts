import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface PendingReview {
  jobId: string;
  jobTitle: string;
  otherPartyId: string;
  otherPartyName: string;
  completedAt: string;
  isCustomer: boolean;
}

export function usePendingReviews() {
  const { user } = useAuth();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPendingReviews = async () => {
    if (!user) {
      setPendingReviews([]);
      setLoading(false);
      return;
    }

    try {
      // Get completed jobs where user is involved
      const { data: jobs, error: jobsError } = await supabase
        .from('job_requests')
        .select('id, title, customer_id, accepted_provider_id, completed_at')
        .eq('status', 'completed')
        .or(`customer_id.eq.${user.id},accepted_provider_id.eq.${user.id}`);

      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) {
        setPendingReviews([]);
        setLoading(false);
        return;
      }

      // Get reviews the user has already submitted
      const { data: existingReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('job_id')
        .eq('reviewer_id', user.id);

      if (reviewsError) throw reviewsError;

      const reviewedJobIds = new Set(existingReviews?.map(r => r.job_id) || []);

      // Filter jobs without user's review
      const jobsNeedingReview = jobs.filter(job => !reviewedJobIds.has(job.id));

      if (jobsNeedingReview.length === 0) {
        setPendingReviews([]);
        setLoading(false);
        return;
      }

      // Get other party profiles
      const otherPartyIds = jobsNeedingReview.map(job => 
        job.customer_id === user.id ? job.accepted_provider_id : job.customer_id
      ).filter(Boolean) as string[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', otherPartyIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const pending: PendingReview[] = jobsNeedingReview.map(job => {
        const isCustomer = job.customer_id === user.id;
        const otherPartyId = isCustomer ? job.accepted_provider_id! : job.customer_id;
        return {
          jobId: job.id,
          jobTitle: job.title,
          otherPartyId,
          otherPartyName: profileMap.get(otherPartyId) || (isCustomer ? 'Provider' : 'Customer'),
          completedAt: job.completed_at!,
          isCustomer,
        };
      });

      setPendingReviews(pending);
    } catch (error) {
      console.error('Failed to load pending reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingReviews();
  }, [user]);

  return {
    pendingReviews,
    hasPendingReviews: pendingReviews.length > 0,
    loading,
    refresh: loadPendingReviews,
  };
}
