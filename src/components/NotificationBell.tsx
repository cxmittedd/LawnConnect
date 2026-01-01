import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNewlyAcceptedJobs } from '@/hooks/useNewlyAcceptedJobs';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface JobWithUnreadMessages {
  jobId: string;
  jobTitle: string;
  unreadCount: number;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { newlyAcceptedJobs, dismissJob, dismissAll, hasNewJobs } = useNewlyAcceptedJobs();
  const [jobsWithUnread, setJobsWithUnread] = useState<JobWithUnreadMessages[]>([]);
  
  useEffect(() => {
    if (!user) {
      setJobsWithUnread([]);
      return;
    }

    const fetchJobsWithUnread = async () => {
      // Get jobs where user is either customer or provider
      const { data: jobs } = await supabase
        .from('job_requests')
        .select('id, title, customer_id, accepted_provider_id')
        .or(`customer_id.eq.${user.id},accepted_provider_id.eq.${user.id}`);

      if (!jobs || jobs.length === 0) {
        setJobsWithUnread([]);
        return;
      }

      // For each job, count unread messages
      const jobsWithCounts: JobWithUnreadMessages[] = [];
      
      for (const job of jobs) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        if (count && count > 0) {
          jobsWithCounts.push({
            jobId: job.id,
            jobTitle: job.title,
            unreadCount: count,
          });
        }
      }

      setJobsWithUnread(jobsWithCounts);
    };

    fetchJobsWithUnread();

    // Subscribe to message changes
    const channel = supabase
      .channel('unread-messages-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchJobsWithUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalUnreadMessages = jobsWithUnread.reduce((sum, job) => sum + job.unreadCount, 0);
  const totalNotifications = totalUnreadMessages + newlyAcceptedJobs.length;

  const handleJobClick = (jobId: string) => {
    dismissJob(jobId);
    navigate(`/job/${jobId}`);
  };

  const handleMessageJobClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-muted transition-colors shrink-0"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
            >
              {totalNotifications > 99 ? '99+' : totalNotifications}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover z-50" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {hasNewJobs && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={dismissAll}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-80">
          {totalNotifications === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No new notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Unread Messages Section - Individual jobs */}
              {jobsWithUnread.map((job) => (
                <button
                  key={job.jobId}
                  onClick={() => handleMessageJobClick(job.jobId)}
                  className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-full bg-primary/10 shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">New Message{job.unreadCount > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {job.unreadCount} unread in "{job.jobTitle}"
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {job.unreadCount}
                  </Badge>
                </button>
              ))}

              {/* Newly Accepted Jobs Section */}
              {newlyAcceptedJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleJobClick(job.id)}
                  className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-full bg-green-500/10 shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Job Accepted!</p>
                    <p className="text-xs text-muted-foreground truncate">
                      "{job.title}" was accepted by {job.providerName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
