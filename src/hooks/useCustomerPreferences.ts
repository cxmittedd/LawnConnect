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

export interface AutopaySettings {
  id?: string;
  enabled: boolean;
  recurring_day: number;
  card_last_four: string | null;
  card_name: string | null;
  next_scheduled_date: string | null;
  location: string | null;
  parish: string | null;
  lawn_size: string | null;
  job_type: string | null;
  additional_requirements: string | null;
}

export function useCustomerPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null);
  const [autopaySettings, setAutopaySettings] = useState<AutopaySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
      loadAutopaySettings();
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

  const loadAutopaySettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('autopay_settings')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAutopaySettings({
          id: data.id,
          enabled: data.enabled,
          recurring_day: data.recurring_day,
          card_last_four: data.card_last_four,
          card_name: data.card_name,
          next_scheduled_date: data.next_scheduled_date,
          location: data.location,
          parish: data.parish,
          lawn_size: data.lawn_size,
          job_type: data.job_type,
          additional_requirements: data.additional_requirements,
        });
      }
    } catch (error) {
      console.error('Error loading autopay settings:', error);
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

  const saveAutopaySettings = async (settings: Omit<AutopaySettings, 'id'>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('autopay_settings')
        .upsert({
          customer_id: user.id,
          ...settings,
        }, {
          onConflict: 'customer_id',
        })
        .select()
        .single();

      if (error) throw error;
      setAutopaySettings({ ...settings, id: data.id });
      return data;
    } catch (error) {
      console.error('Error saving autopay settings:', error);
      throw error;
    }
  };

  const disableAutopay = async () => {
    if (!user || !autopaySettings?.id) return;
    
    try {
      const { error } = await supabase
        .from('autopay_settings')
        .update({ enabled: false })
        .eq('customer_id', user.id);

      if (error) throw error;
      setAutopaySettings(prev => prev ? { ...prev, enabled: false } : null);
    } catch (error) {
      console.error('Error disabling autopay:', error);
      throw error;
    }
  };

  return {
    preferences,
    autopaySettings,
    loading,
    savePreferences,
    saveAutopaySettings,
    disableAutopay,
    refreshAutopay: loadAutopaySettings,
  };
}
