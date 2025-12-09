import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type VerificationStatus = 'pending' | 'approved' | 'rejected' | null;

export function useProviderVerification() {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(null);
  const [loading, setLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is a provider
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      const isUserProvider = profile?.user_role === 'provider' || profile?.user_role === 'both';
      setIsProvider(isUserProvider);

      if (!isUserProvider) {
        setVerificationStatus(null);
        setLoading(false);
        return;
      }

      // Check verification status
      const { data: verification } = await supabase
        .from('provider_verifications')
        .select('status')
        .eq('provider_id', user.id)
        .maybeSingle();

      setVerificationStatus(verification?.status as VerificationStatus || null);
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = verificationStatus === 'approved';
  const isPending = verificationStatus === 'pending';
  const isRejected = verificationStatus === 'rejected';
  const needsVerification = isProvider && !isVerified;

  return {
    isProvider,
    isVerified,
    isPending,
    isRejected,
    needsVerification,
    verificationStatus,
    loading,
    refresh: checkVerificationStatus,
  };
}
