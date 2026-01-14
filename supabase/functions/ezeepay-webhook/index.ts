import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from EzeePay
    const formData = await req.formData().catch(() => null);
    let payload: Record<string, string> = {};
    
    if (formData) {
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      // Try JSON format
      payload = await req.json().catch(() => ({}));
    }

    console.log('EzeePay webhook received:', payload);

    const {
      ResponseCode,
      ResponseDescription,
      TransactionNumber,
      order_id,
    } = payload;

    if (!order_id) {
      console.error('Missing order_id in webhook payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was successful (ResponseCode === '1')
    const isSuccess = String(ResponseCode) === '1';

    if (isSuccess) {
      // Update the job with payment confirmation
      const { data: job, error: updateError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_reference: TransactionNumber || `EZEE-${Date.now()}`,
          payment_confirmed_at: new Date().toISOString(),
          status: 'open',
        })
        .eq('id', order_id)
        .eq('payment_status', 'pending')
        .select()
        .single();

      if (updateError) {
        console.error('Error updating job payment status:', updateError);
        // Job might already be updated or not found
      } else {
        console.log('Job payment confirmed:', job?.id);
      }
    } else {
      console.log('Payment failed:', ResponseDescription);
      // Optionally update job status to failed
      await supabase
        .from('job_requests')
        .update({
          payment_status: 'failed',
        })
        .eq('id', order_id)
        .eq('payment_status', 'pending');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: true,
        payment_success: isSuccess,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('EzeePay webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook processing failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
