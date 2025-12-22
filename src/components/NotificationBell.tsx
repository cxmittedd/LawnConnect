import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNewlyAcceptedJobs } from '@/hooks/useNewlyAcceptedJobs';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, CheckCircle } from 'lucide-react';

export function NotificationBell() {
  const navigate = useNavigate();
  const unreadMessages = useUnreadMessages();
  const { newlyAcceptedJobs, dismissJob, dismissAll, hasNewJobs } = useNewlyAcceptedJobs();
  
  const totalNotifications = unreadMessages + newlyAcceptedJobs.length;

  const handleJobClick = (jobId: string) => {
    dismissJob(jobId);
    navigate(`/job/${jobId}`);
  };

  const handleMessagesClick = () => {
    navigate('/my-jobs');
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
              {/* Unread Messages Section */}
              {unreadMessages > 0 && (
                <button
                  onClick={handleMessagesClick}
                  className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-full bg-primary/10 shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Unread Messages</p>
                    <p className="text-xs text-muted-foreground">
                      You have {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {unreadMessages}
                  </Badge>
                </button>
              )}

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

        {totalNotifications > 0 && (
          <div className="p-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={handleMessagesClick}
            >
              View all activity
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
