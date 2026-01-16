import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type BankingStatus = 'pending' | 'verified' | 'rejected' | null;

interface BankingDetails {
  id: string;
  full_legal_name: string;
  bank_name: 'scotiabank_jamaica' | 'ncb_jamaica';
  branch_name: string;
  branch_number: string | null;
  account_number: string;
  account_type: 'savings' | 'chequing';
  trn: string;
  status: BankingStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useProviderBanking() {
  const { user } = useAuth();
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [bankingStatus, setBankingStatus] = useState<BankingStatus>(null);
  const [loading, setLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    checkBankingStatus();
  }, [user]);

  const checkBankingStatus = async () => {
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
        setBankingStatus(null);
        setLoading(false);
        return;
      }

      // Check banking details
      const { data: banking } = await supabase
        .from('provider_banking_details')
        .select('*')
        .eq('provider_id', user.id)
        .maybeSingle();

      if (banking) {
        setBankingDetails(banking as BankingDetails);
        setBankingStatus(banking.status as BankingStatus);
      } else {
        setBankingDetails(null);
        setBankingStatus(null);
      }
    } catch (error) {
      console.error('Error checking banking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = bankingStatus === 'verified';
  const isPending = bankingStatus === 'pending';
  const isRejected = bankingStatus === 'rejected';
  const needsBanking = isProvider && !isVerified;
  const hasBankingSubmitted = bankingStatus !== null;

  return {
    isProvider,
    isVerified,
    isPending,
    isRejected,
    needsBanking,
    hasBankingSubmitted,
    bankingStatus,
    bankingDetails,
    loading,
    refresh: checkBankingStatus,
  };
}
