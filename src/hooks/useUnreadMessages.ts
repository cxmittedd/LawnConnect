import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      // Get jobs where user is either customer or provider
      const { data: jobs } = await supabase
        .from('job_requests')
        .select('id, customer_id, accepted_provider_id')
        .or(`customer_id.eq.${user.id},accepted_provider_id.eq.${user.id}`);

      if (!jobs || jobs.length === 0) {
        setUnreadCount(0);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Count unread messages (not sent by current user and not read)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
}
