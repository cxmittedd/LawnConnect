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
  frequency: 'monthly' | 'bimonthly';
  recurring_day: number;
  recurring_day_2?: number | null;
  card_last_four: string | null;
  card_name: string | null;
  next_scheduled_date: string | null;
  next_scheduled_date_2?: string | null;
  location: string | null;
  location_name: string | null;
  parish: string | null;
  lawn_size: string | null;
  job_type: string | null;
  additional_requirements: string | null;
}

export function useCustomerPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null);
  const [autopaySettings, setAutopaySettings] = useState<AutopaySettings[]>([]);
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
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setAutopaySettings(data.map(d => ({
          id: d.id,
          enabled: d.enabled,
          frequency: (d.frequency as 'monthly' | 'bimonthly') || 'monthly',
          recurring_day: d.recurring_day,
          recurring_day_2: d.recurring_day_2,
          card_last_four: d.card_last_four,
          card_name: d.card_name,
          next_scheduled_date: d.next_scheduled_date,
          next_scheduled_date_2: d.next_scheduled_date_2,
          location: d.location,
          location_name: d.location_name,
          parish: d.parish,
          lawn_size: d.lawn_size,
          job_type: d.job_type,
          additional_requirements: d.additional_requirements,
        })));
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
        .insert({
          customer_id: user.id,
          enabled: settings.enabled,
          frequency: settings.frequency,
          recurring_day: settings.recurring_day,
          recurring_day_2: settings.recurring_day_2,
          card_last_four: settings.card_last_four,
          card_name: settings.card_name,
          next_scheduled_date: settings.next_scheduled_date,
          next_scheduled_date_2: settings.next_scheduled_date_2,
          location: settings.location,
          location_name: settings.location_name,
          parish: settings.parish,
          lawn_size: settings.lawn_size,
          job_type: settings.job_type,
          additional_requirements: settings.additional_requirements,
        })
        .select()
        .single();

      if (error) throw error;
      await loadAutopaySettings();
      return data;
    } catch (error) {
      console.error('Error saving autopay settings:', error);
      throw error;
    }
  };

  const disableAutopay = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('autopay_settings')
        .update({ enabled: false })
        .eq('id', id)
        .eq('customer_id', user.id);

      if (error) throw error;
      await loadAutopaySettings();
    } catch (error) {
      console.error('Error disabling autopay:', error);
      throw error;
    }
  };

  const updateAutopaySettings = async (settings: AutopaySettings) => {
    if (!user || !settings.id) return;
    
    try {
      const { error } = await supabase
        .from('autopay_settings')
        .update({
          frequency: settings.frequency,
          recurring_day: settings.recurring_day,
          recurring_day_2: settings.recurring_day_2,
          location: settings.location,
          location_name: settings.location_name,
          parish: settings.parish,
          lawn_size: settings.lawn_size,
          job_type: settings.job_type,
          additional_requirements: settings.additional_requirements,
        })
        .eq('id', settings.id)
        .eq('customer_id', user.id);

      if (error) throw error;
      await loadAutopaySettings();
    } catch (error) {
      console.error('Error updating autopay settings:', error);
      throw error;
    }
  };

  const deleteAutopay = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('autopay_settings')
        .delete()
        .eq('id', id)
        .eq('customer_id', user.id);

      if (error) throw error;
      await loadAutopaySettings();
    } catch (error) {
      console.error('Error deleting autopay:', error);
      throw error;
    }
  };

  return {
    preferences,
    autopaySettings,
    loading,
    savePreferences,
    saveAutopaySettings,
    updateAutopaySettings,
    disableAutopay,
    deleteAutopay,
    refreshAutopay: loadAutopaySettings,
  };
}
