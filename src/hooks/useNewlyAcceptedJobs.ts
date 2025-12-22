import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AcceptedJob {
  id: string;
  title: string;
  providerName: string | null;
  acceptedAt: string;
}

const LAST_SEEN_KEY = 'lawnconnect_last_seen_accepted_jobs';

export function useNewlyAcceptedJobs() {
  const { user } = useAuth();
  const [newlyAcceptedJobs, setNewlyAcceptedJobs] = useState<AcceptedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const checkForNewlyAcceptedJobs = useCallback(async () => {
    if (!user) {
      setNewlyAcceptedJobs([]);
      setLoading(false);
      return;
    }

    try {
      // Get last seen timestamp from localStorage
      const lastSeenStr = localStorage.getItem(LAST_SEEN_KEY);
      const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0);

      // Fetch jobs that customer posted which were accepted since last seen
      const { data: jobs, error } = await supabase
        .from('job_requests')
        .select(`
          id,
          title,
          updated_at,
          accepted_provider_id
        `)
        .eq('customer_id', user.id)
        .eq('status', 'accepted')
        .not('accepted_provider_id', 'is', null)
        .gt('updated_at', lastSeen.toISOString());

      if (error) {
        console.error('Error fetching newly accepted jobs:', error);
        setLoading(false);
        return;
      }

      if (jobs && jobs.length > 0) {
        // Fetch provider names for accepted jobs
        const providerIds = [...new Set(jobs.map(j => j.accepted_provider_id).filter(Boolean))];
        
        const { data: providers } = await supabase
          .from('profiles')
          .select('id, first_name, company_name')
          .in('id', providerIds);

        const providerMap = new Map(
          providers?.map(p => [p.id, p.company_name || p.first_name || 'A provider']) || []
        );

        const acceptedJobs: AcceptedJob[] = jobs.map(job => ({
          id: job.id,
          title: job.title,
          providerName: providerMap.get(job.accepted_provider_id!) || 'A provider',
          acceptedAt: job.updated_at!,
        }));

        setNewlyAcceptedJobs(acceptedJobs);
      } else {
        setNewlyAcceptedJobs([]);
      }
    } catch (error) {
      console.error('Error checking for newly accepted jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const dismissJob = useCallback((jobId: string) => {
    setNewlyAcceptedJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const dismissAll = useCallback(() => {
    // Update last seen timestamp to now
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setNewlyAcceptedJobs([]);
  }, []);

  useEffect(() => {
    checkForNewlyAcceptedJobs();

    // Subscribe to job status changes
    if (user) {
      const channel = supabase
        .channel('accepted-jobs-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'job_requests',
            filter: `customer_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new && (payload.new as any).status === 'accepted') {
              checkForNewlyAcceptedJobs();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, checkForNewlyAcceptedJobs]);

  return { 
    newlyAcceptedJobs, 
    loading, 
    dismissJob, 
    dismissAll,
    hasNewJobs: newlyAcceptedJobs.length > 0 
  };
}
