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
const DISMISSED_JOBS_KEY = 'lawnconnect_dismissed_job_ids';

// Helper to get dismissed job IDs from localStorage
const getDismissedJobIds = (): Set<string> => {
  const stored = localStorage.getItem(DISMISSED_JOBS_KEY);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
};

// Helper to save dismissed job IDs to localStorage
const saveDismissedJobIds = (ids: Set<string>) => {
  localStorage.setItem(DISMISSED_JOBS_KEY, JSON.stringify([...ids]));
};

// Helper to clean up old dismissed job IDs (jobs that no longer exist)
const cleanupDismissedJobIds = async (supabase: any, dismissedIds: Set<string>): Promise<Set<string>> => {
  if (dismissedIds.size === 0) return dismissedIds;
  
  try {
    // Check which dismissed jobs still exist
    const { data: existingJobs } = await supabase
      .from('job_requests')
      .select('id')
      .in('id', [...dismissedIds]);
    
    const existingJobIds = new Set(existingJobs?.map((j: { id: string }) => j.id) || []);
    
    // Keep only dismissed IDs that still exist in the database
    const cleanedIds = new Set([...dismissedIds].filter(id => existingJobIds.has(id)));
    
    // If we cleaned up some IDs, save the updated set
    if (cleanedIds.size !== dismissedIds.size) {
      saveDismissedJobIds(cleanedIds);
    }
    
    return cleanedIds;
  } catch {
    return dismissedIds;
  }
};

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
      
      // Get dismissed job IDs and clean up old ones
      const rawDismissedIds = getDismissedJobIds();
      const dismissedIds = await cleanupDismissedJobIds(supabase, rawDismissedIds);

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
        // Filter out dismissed jobs
        const filteredJobs = jobs.filter(job => !dismissedIds.has(job.id));
        
        if (filteredJobs.length > 0) {
          // Fetch provider names for accepted jobs
          const providerIds = [...new Set(filteredJobs.map(j => j.accepted_provider_id).filter(Boolean))];
          
          const { data: providers } = await supabase
            .from('profiles')
            .select('id, first_name, company_name')
            .in('id', providerIds);

          const providerMap = new Map(
            providers?.map(p => [p.id, p.company_name || p.first_name || 'A provider']) || []
          );

          const acceptedJobs: AcceptedJob[] = filteredJobs.map(job => ({
            id: job.id,
            title: job.title,
            providerName: providerMap.get(job.accepted_provider_id!) || 'A provider',
            acceptedAt: job.updated_at!,
          }));

          setNewlyAcceptedJobs(acceptedJobs);
        } else {
          setNewlyAcceptedJobs([]);
        }
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
    // Add to dismissed IDs in localStorage
    const dismissedIds = getDismissedJobIds();
    dismissedIds.add(jobId);
    saveDismissedJobIds(dismissedIds);
    
    setNewlyAcceptedJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const dismissAll = useCallback(() => {
    // Add all current job IDs to dismissed list
    const dismissedIds = getDismissedJobIds();
    newlyAcceptedJobs.forEach(job => dismissedIds.add(job.id));
    saveDismissedJobIds(dismissedIds);
    
    // Update last seen timestamp to now
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setNewlyAcceptedJobs([]);
  }, [newlyAcceptedJobs]);

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
