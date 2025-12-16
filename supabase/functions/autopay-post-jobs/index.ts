import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutopaySettings {
  id: string;
  customer_id: string;
  enabled: boolean;
  frequency: string;
  recurring_day: number;
  recurring_day_2: number | null;
  card_last_four: string | null;
  card_name: string | null;
  next_scheduled_date: string | null;
  next_scheduled_date_2: string | null;
  location: string | null;
  location_name: string | null;
  parish: string | null;
  lawn_size: string | null;
  job_type: string | null;
  additional_requirements: string | null;
}

const LAWN_SIZE_PRICES: Record<string, number> = {
  'small': 7000,
  'medium': 8000,
  'large': 12000,
  'xlarge': 18000,
};

const LAWN_SIZE_LABELS: Record<string, string> = {
  'small': 'Small (Up to 1/8 acre)',
  'medium': 'Medium (1/8 - 1/4 acre)',
  'large': 'Large (1/4 - 1/2 acre)',
  'xlarge': 'Extra Large (1/2 - 1 acre)',
};

async function createJobForSettings(
  supabase: SupabaseClient,
  settings: AutopaySettings,
  targetDateStr: string,
  isSecondCut: boolean
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const basePrice = LAWN_SIZE_PRICES[settings.lawn_size || 'small'] || 7000;
    const platformFee = Math.round(basePrice * 0.30);
    const providerPayout = basePrice - platformFee;
    const lawnSizeLabel = LAWN_SIZE_LABELS[settings.lawn_size || 'small'] || settings.lawn_size;

    const { data: job, error: jobError } = await supabase
      .from('job_requests')
      .insert({
        customer_id: settings.customer_id,
        title: settings.job_type || 'Basic Grass Cutting',
        location: settings.location || '',
        parish: settings.parish || 'Kingston',
        lawn_size: lawnSizeLabel,
        preferred_date: targetDateStr,
        additional_requirements: settings.additional_requirements,
        customer_offer: basePrice,
        base_price: basePrice,
        final_price: basePrice,
        platform_fee: platformFee,
        provider_payout: providerPayout,
        payment_status: 'paid',
        payment_reference: `AUTOPAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        payment_confirmed_at: new Date().toISOString(),
        payment_confirmed_by: settings.customer_id,
        status: 'open',
      })
      .select()
      .single();

    if (jobError) {
      return { success: false, error: jobError.message };
    }

    // Update next scheduled date
    const currentDate = new Date(targetDateStr);
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    const recurringDay = isSecondCut ? settings.recurring_day_2 : settings.recurring_day;
    if (nextDate.getDate() !== recurringDay) {
      nextDate.setDate(0);
    }
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const updateField = isSecondCut ? 'next_scheduled_date_2' : 'next_scheduled_date';
    await supabase
      .from('autopay_settings')
      .update({ [updateField]: nextDateStr })
      .eq('id', settings.id);

    return { success: true, jobId: (job as { id: string }).id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendNotification(
  supabase: SupabaseClient,
  settings: AutopaySettings,
  targetDateStr: string,
  supabaseUrl: string
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', settings.customer_id)
      .single();

    const { data: userData } = await supabase.auth.admin.getUserById(settings.customer_id);
    
    if (userData?.user?.email) {
      await supabase.functions.invoke('send-notification', {
        body: {
          to: userData.user.email,
          subject: 'Your Autopay Job Has Been Posted',
          recipientName: (profile as { first_name: string } | null)?.first_name || 'Valued Customer',
          messagePreview: `Your scheduled lawn cutting job for "${settings.location_name}" has been automatically posted for ${targetDateStr}.`,
          sections: [
            {
              heading: 'Autopay Job Posted',
              body: `Your recurring lawn care job for "${settings.location_name}" has been automatically posted. The scheduled cut date is ${targetDateStr}. Service providers can now submit proposals for your job.`,
            },
          ],
          ctaText: 'View Your Job',
          ctaUrl: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/my-jobs`,
        },
      });
    }
  } catch (notifyError) {
    console.error('Error sending notification:', notifyError);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Security: Only allow service role key authentication (for cron jobs)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (token !== supabaseServiceKey) {
      console.error('Invalid authorization - service role key required');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - cron only' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the date 2 days from now
    const targetCutDate = new Date(today);
    targetCutDate.setDate(targetCutDate.getDate() + 2);
    const targetDateStr = targetCutDate.toISOString().split('T')[0];

    console.log(`Checking for autopay jobs with cut date: ${targetDateStr}`);

    // Find all enabled autopay settings
    const { data: allSettings, error: fetchError } = await supabase
      .from('autopay_settings')
      .select('*')
      .eq('enabled', true);

    if (fetchError) {
      console.error('Error fetching autopay settings:', fetchError);
      throw fetchError;
    }

    const results: { success: number; failed: number; details: string[] } = {
      success: 0,
      failed: 0,
      details: [],
    };

    for (const settings of (allSettings || []) as AutopaySettings[]) {
      // Check first cut date
      if (settings.next_scheduled_date === targetDateStr) {
        console.log(`Processing first cut for ${settings.location_name || settings.id}`);
        const result = await createJobForSettings(supabase, settings, targetDateStr, false);
        if (result.success) {
          results.success++;
          results.details.push(`Success (cut 1): ${settings.location_name || settings.id} - Job ${result.jobId}`);
          await sendNotification(supabase, settings, targetDateStr, supabaseUrl);
        } else {
          results.failed++;
          results.details.push(`Failed (cut 1): ${settings.location_name || settings.id} - ${result.error}`);
        }
      }

      // Check second cut date for bimonthly
      if (settings.frequency === 'bimonthly' && settings.next_scheduled_date_2 === targetDateStr) {
        console.log(`Processing second cut for ${settings.location_name || settings.id}`);
        const result = await createJobForSettings(supabase, settings, targetDateStr, true);
        if (result.success) {
          results.success++;
          results.details.push(`Success (cut 2): ${settings.location_name || settings.id} - Job ${result.jobId}`);
          await sendNotification(supabase, settings, targetDateStr, supabaseUrl);
        } else {
          results.failed++;
          results.details.push(`Failed (cut 2): ${settings.location_name || settings.id} - ${result.error}`);
        }
      }
    }

    console.log('Autopay processing complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Autopay jobs processed',
        date: targetDateStr,
        ...results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in autopay-post-jobs:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
