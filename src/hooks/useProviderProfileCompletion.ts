import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompletion {
  isComplete: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  loading: boolean;
  avatarUrl: string | null;
  bio: string | null;
}

export function useProviderProfileCompletion() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion>({
    isComplete: false,
    hasAvatar: false,
    hasBio: false,
    loading: true,
    avatarUrl: null,
    bio: null,
  });

  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, bio, user_role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const isProvider = data.user_role === 'provider' || data.user_role === 'both';
      const hasAvatar = !!data.avatar_url;
      const hasBio = !!data.bio && data.bio.trim().length > 0;

      setCompletion({
        isComplete: !isProvider || (hasAvatar && hasBio),
        hasAvatar,
        hasBio,
        loading: false,
        avatarUrl: data.avatar_url,
        bio: data.bio,
      });
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setCompletion(prev => ({ ...prev, loading: false }));
    }
  };

  return { ...completion, refetch: checkProfileCompletion };
}
