import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FISERV_API_BASE_URL = 'https://cert.api.firstdata.com/gateway/v2';
const STORE_ID = '72305408';

interface VerifyPaymentRequest {
  transactionId?: string;
  orderId?: string;
  jobId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let body: VerifyPaymentRequest;
    let userId: string | null = null;

    // Check if this is a webhook callback from Fiserv or a client request
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // Handle form-encoded data from Fiserv redirect
      const formData = await req.formData();
      body = {
        transactionId: formData.get('ipgTransactionId') as string || formData.get('oid') as string,
        orderId: formData.get('oid') as string,
        jobId: formData.get('jobId') as string || ''
      };
    }

    // For client requests, verify JWT
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && user) {
        userId = user.id;
      }
    }

    const { transactionId, orderId, jobId } = body;

    console.log('Verifying payment:', { transactionId, orderId, jobId });

    if (!transactionId && !orderId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID or Order ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Fiserv credentials
    const apiKey = Deno.env.get('PAYMENT_GATEWAY_API_KEY');
    const apiSecret = Deno.env.get('PAYMENT_GATEWAY_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('Missing Fiserv credentials');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HMAC signature for inquiry
    const timestamp = Date.now().toString();
    const clientRequestId = `CR-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create inquiry request
    const inquiryEndpoint = transactionId 
      ? `${FISERV_API_BASE_URL}/payments/${transactionId}`
      : `${FISERV_API_BASE_URL}/orders/${orderId}`;

    // For GET requests, the message to sign is different
    const messageToSign = apiKey + clientRequestId + timestamp;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(messageToSign);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const messageSignature = encodeBase64(signature);

    console.log('Querying Fiserv for transaction status');

    // Call Fiserv API to verify transaction
    const fiservResponse = await fetch(inquiryEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Client-Request-Id': clientRequestId,
        'Timestamp': timestamp,
        'Message-Signature': messageSignature,
      }
    });

    const responseText = await fiservResponse.text();
    console.log('Fiserv verification response status:', fiservResponse.status);
    console.log('Fiserv verification response:', responseText);

    let paymentVerified = false;
    let paymentReference = transactionId || orderId || '';
    let transactionStatus = 'unknown';

    if (fiservResponse.ok) {
      try {
        const fiservData = JSON.parse(responseText);
        transactionStatus = fiservData.transactionStatus || fiservData.status || 'unknown';
        paymentVerified = ['APPROVED', 'CAPTURED', 'COMPLETED'].includes(transactionStatus.toUpperCase());
        paymentReference = fiservData.ipgTransactionId || fiservData.orderId || paymentReference;
      } catch (e) {
        console.error('Error parsing Fiserv response:', e);
      }
    }

    // If we have a jobId, update the job status
    if (jobId && paymentVerified) {
      console.log('Updating job payment status for:', jobId);

      const { error: updateError } = await adminClient
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_reference: paymentReference,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: userId,
          status: 'open'
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job:', updateError);
      } else {
        console.log('Job payment status updated successfully');

        // Get job details for email
        const { data: job } = await adminClient
          .from('job_requests')
          .select('*, customer:customer_id(id, email:id)')
          .eq('id', jobId)
          .single();

        if (job) {
          // Get customer email from auth
          const { data: authUser } = await adminClient.auth.admin.getUserById(job.customer_id);
          
          if (authUser?.user?.email) {
            // Send invoice email
            try {
              const { data: profile } = await adminClient
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', job.customer_id)
                .single();

              const customerName = profile 
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer'
                : 'Customer';

              // Invoke send-invoice function
              await fetch(`${supabaseUrl}/functions/v1/send-invoice`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                  jobId: job.id,
                  customerId: job.customer_id,
                  customerEmail: authUser.user.email,
                  customerName,
                  jobTitle: job.title,
                  jobLocation: job.location,
                  parish: job.parish,
                  lawnSize: job.lawn_size,
                  amount: job.final_price,
                  platformFee: job.platform_fee,
                  paymentReference
                })
              });

              console.log('Invoice email sent');
            } catch (emailError) {
              console.error('Error sending invoice email:', emailError);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: paymentVerified,
        verified: paymentVerified,
        transactionId: paymentReference,
        status: transactionStatus,
        jobId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error verifying payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
