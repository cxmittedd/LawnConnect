import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface CustomerPreferences {
  location: string;
  parish: string;
  lawn_size: string;
  job_type: string;
  additional_requirements: string;
}

export function useCustomerPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPreferences({
          location: data.location || '',
          parish: data.parish || '',
          lawn_size: data.lawn_size || '',
          job_type: data.job_type || '',
          additional_requirements: data.additional_requirements || '',
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (prefs: CustomerPreferences) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('customer_preferences')
        .upsert({
          customer_id: user.id,
          ...prefs,
        }, {
          onConflict: 'customer_id',
        });

      if (error) throw error;
      setPreferences(prefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return {
    preferences,
    loading,
    savePreferences,
  };
}
