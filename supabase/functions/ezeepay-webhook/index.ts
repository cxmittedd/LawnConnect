import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Track processed webhooks to prevent replay attacks (in-memory for edge function)
const processedWebhooks = new Set<string>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from EzeePay
    const rawBody = await req.text();
    console.log('Raw webhook body:', rawBody);
    
    let payload: Record<string, string> = {};
    
    // Check if the body looks like JSON (starts with { or [)
    const trimmedBody = rawBody.trim();
    if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
      // Parse as JSON
      try {
        payload = JSON.parse(trimmedBody);
        console.log('Parsed as JSON:', payload);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    } else {
      // Try form data (URL encoded)
      try {
        const formData = new URLSearchParams(rawBody);
        formData.forEach((value, key) => {
          // Check if the key itself looks like JSON (EzeePay sometimes sends JSON as form key)
          if (key.startsWith('{') && value === '') {
            try {
              const jsonFromKey = JSON.parse(key);
              Object.assign(payload, jsonFromKey);
              console.log('Parsed JSON from form key:', jsonFromKey);
            } catch {
              payload[key] = value;
            }
          } else {
            payload[key] = value;
          }
        });
        console.log('Parsed as form data:', payload);
      } catch (e) {
        console.error('Failed to parse form data:', e);
      }
    }

    console.log('Final parsed payload:', JSON.stringify(payload, null, 2));

    // EzeePay sends CustomOrderId, not order_id
    const {
      ResponseCode,
      ResponseDescription,
      TransactionNumber,
      CustomOrderId,
      order_id,
    } = payload;

    // Use CustomOrderId if order_id is not present (EzeePay uses CustomOrderId)
    const orderId = CustomOrderId || order_id;

    // Validate required fields
    if (!orderId) {
      console.error('Missing order_id/CustomOrderId in webhook payload. Available keys:', Object.keys(payload));
      return new Response(
        JSON.stringify({ success: false, error: 'Missing order_id', received_keys: Object.keys(payload) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order_id format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.error('Invalid order_id format:', orderId);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid order_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create idempotency key to prevent replay attacks
    const idempotencyKey = `${orderId}-${TransactionNumber || 'no-txn'}`;
    
    // Check if we've already processed this webhook
    if (processedWebhooks.has(idempotencyKey)) {
      console.log('Duplicate webhook detected, ignoring:', idempotencyKey);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the job exists and is in the correct state BEFORE processing
    const { data: existingJob, error: fetchError } = await supabase
      .from('job_requests')
      .select('id, payment_status, customer_id, base_price')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingJob) {
      console.error('Job not found for order_id:', orderId, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only process if payment is still pending
    if (existingJob.payment_status !== 'pending') {
      console.log('Job payment status is not pending:', existingJob.payment_status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          current_status: existingJob.payment_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was successful (ResponseCode === '1')
    const isSuccess = String(ResponseCode) === '1';

    if (isSuccess) {
      // Validate TransactionNumber exists for successful payments
      if (!TransactionNumber) {
        console.error('Missing TransactionNumber for successful payment');
        return new Response(
          JSON.stringify({ success: false, error: 'Missing transaction reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as processed BEFORE updating to prevent race conditions
      processedWebhooks.add(idempotencyKey);

      // Update the job with payment confirmation
      const { data: job, error: updateError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_reference: TransactionNumber,
          payment_confirmed_at: new Date().toISOString(),
          status: 'open',
        })
        .eq('id', orderId)
        .eq('payment_status', 'pending') // Double-check to prevent race conditions
        .select()
        .single();

      if (updateError) {
        console.error('Error updating job payment status:', updateError);
        // Remove from processed set if update failed
        processedWebhooks.delete(idempotencyKey);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update payment status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Job payment confirmed:', job?.id, 'Transaction:', TransactionNumber);

      // Clean up old processed webhooks to prevent memory issues (keep last 1000)
      if (processedWebhooks.size > 1000) {
        const entries = Array.from(processedWebhooks);
        entries.slice(0, entries.length - 1000).forEach(key => processedWebhooks.delete(key));
      }

    } else {
      console.log('Payment failed:', ResponseDescription);
      
      // Update job status to failed
      const { error: failError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'failed',
        })
        .eq('id', orderId)
        .eq('payment_status', 'pending');

      if (failError) {
        console.error('Error updating failed payment status:', failError);
      }
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
        error: 'Webhook processing failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
