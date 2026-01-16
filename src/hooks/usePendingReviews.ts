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
      // Only customers need to leave reviews - providers are excluded
      // Get completed jobs where user is the CUSTOMER only
      const { data: jobs, error: jobsError } = await supabase
        .from('job_requests')
        .select('id, title, customer_id, accepted_provider_id, completed_at')
        .eq('status', 'completed')
        .eq('customer_id', user.id);

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

      // Get provider profiles (user is always customer in this query)
      const providerIds = jobsNeedingReview
        .map(job => job.accepted_provider_id)
        .filter(Boolean) as string[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, first_name')
        .in('id', providerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.first_name || 'Provider']) || []);

      const pending: PendingReview[] = jobsNeedingReview.map(job => ({
        jobId: job.id,
        jobTitle: job.title,
        otherPartyId: job.accepted_provider_id!,
        otherPartyName: profileMap.get(job.accepted_provider_id!) || 'Provider',
        completedAt: job.completed_at!,
        isCustomer: true, // User is always customer now
      }));

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
