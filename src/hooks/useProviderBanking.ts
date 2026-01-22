import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type BankingStatus = 'pending' | 'verified' | 'rejected' | null;

// Only expose safe/masked data to client - never full account numbers or TRN
interface BankingDetails {
  id: string;
  full_legal_name: string;
  bank_name: 'scotiabank_jamaica' | 'ncb_jamaica';
  branch_name: string;
  branch_number: string | null;
  account_number_masked: string; // Only last 4 digits
  account_type: 'savings' | 'chequing';
  trn_masked: string; // Only last 3 digits
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

      // Check banking details - only fetch safe fields, mask sensitive data
      const { data: banking } = await supabase
        .from('provider_banking_details')
        .select('id, full_legal_name, bank_name, branch_name, branch_number, account_number, account_type, trn, status, admin_notes, created_at, updated_at')
        .eq('provider_id', user.id)
        .maybeSingle();

      if (banking) {
        // Mask sensitive data before storing in state
        const maskedDetails: BankingDetails = {
          id: banking.id,
          full_legal_name: banking.full_legal_name,
          bank_name: banking.bank_name,
          branch_name: banking.branch_name,
          branch_number: banking.branch_number,
          account_number_masked: banking.account_number ? `****${banking.account_number.slice(-4)}` : '****',
          account_type: banking.account_type,
          trn_masked: banking.trn ? `******${banking.trn.slice(-3)}` : '***',
          status: banking.status as BankingStatus,
          admin_notes: banking.admin_notes,
          created_at: banking.created_at,
          updated_at: banking.updated_at,
        };
        setBankingDetails(maskedDetails);
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
