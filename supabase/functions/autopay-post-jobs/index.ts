import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutopaySettings {
  id: string;
  customer_id: string;
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

const LAWN_SIZE_PRICES: Record<string, number> = {
  'small': 7000,
  'medium': 8000,
  'large': 12000,
  'xlarge': 18000,
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the date 2 days from now (jobs should be posted 2 days before cut date)
    const targetCutDate = new Date(today);
    targetCutDate.setDate(targetCutDate.getDate() + 2);
    const targetDateStr = targetCutDate.toISOString().split('T')[0];

    console.log(`Checking for autopay jobs with cut date: ${targetDateStr}`);

    // Find all autopay settings where next_scheduled_date is 2 days from now
    const { data: autopaySettings, error: fetchError } = await supabase
      .from('autopay_settings')
      .select('*')
      .eq('enabled', true)
      .eq('next_scheduled_date', targetDateStr);

    if (fetchError) {
      console.error('Error fetching autopay settings:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${autopaySettings?.length || 0} autopay jobs to process`);

    const results: { success: number; failed: number; details: string[] } = {
      success: 0,
      failed: 0,
      details: [],
    };

    for (const settings of (autopaySettings || []) as AutopaySettings[]) {
      try {
        console.log(`Processing autopay for customer: ${settings.customer_id}`);

        // Calculate price based on lawn size
        const basePrice = LAWN_SIZE_PRICES[settings.lawn_size || 'small'] || 7000;
        const platformFee = Math.round(basePrice * 0.30);
        const providerPayout = basePrice - platformFee;

        // Get lawn size label
        const lawnSizeLabels: Record<string, string> = {
          'small': 'Small (Up to 1/8 acre)',
          'medium': 'Medium (1/8 - 1/4 acre)',
          'large': 'Large (1/4 - 1/2 acre)',
          'xlarge': 'Extra Large (1/2 - 1 acre)',
        };
        const lawnSizeLabel = lawnSizeLabels[settings.lawn_size || 'small'] || settings.lawn_size;

        // Create the job
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
          console.error(`Error creating job for customer ${settings.customer_id}:`, jobError);
          results.failed++;
          results.details.push(`Failed for ${settings.customer_id}: ${jobError.message}`);
          continue;
        }

        console.log(`Created job ${job.id} for customer ${settings.customer_id}`);

        // Update next_scheduled_date to next month
        const nextDate = new Date(settings.next_scheduled_date!);
        nextDate.setMonth(nextDate.getMonth() + 1);
        // Handle edge case where day doesn't exist in next month
        if (nextDate.getDate() !== settings.recurring_day) {
          nextDate.setDate(0); // Last day of previous month
        }
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const { error: updateError } = await supabase
          .from('autopay_settings')
          .update({ next_scheduled_date: nextDateStr })
          .eq('id', settings.id);

        if (updateError) {
          console.error(`Error updating next date for ${settings.customer_id}:`, updateError);
        }

        // Send notification to customer
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
                recipientName: profile?.first_name || 'Valued Customer',
                messagePreview: `Your scheduled lawn cutting job has been automatically posted for ${targetDateStr}.`,
                sections: [
                  {
                    heading: 'Autopay Job Posted',
                    body: `Your recurring lawn care job has been automatically posted. The scheduled cut date is ${targetDateStr}. Service providers can now submit proposals for your job.`,
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

        results.success++;
        results.details.push(`Success for ${settings.customer_id}: Job ${job.id}`);
      } catch (error) {
        console.error(`Error processing autopay for ${settings.customer_id}:`, error);
        results.failed++;
        results.details.push(`Failed for ${settings.customer_id}: ${String(error)}`);
      }
    }

    console.log('Autopay processing complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Autopay jobs processed',
        processed: (autopaySettings?.length || 0),
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
