import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FISERV_API_BASE_URL = 'https://cert.api.firstdata.com/gateway/v2';
const STORE_ID = '72305408';

interface PaymentUrlRequest {
  amount: number;
  currency: string;
  orderId: string;
  jobId?: string;
  customerEmail?: string;
  customerId?: string;
  jobTitle?: string;
  successUrl: string;
  failureUrl: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentUrlRequest = await req.json();
    const { amount, currency, orderId, jobId, successUrl, failureUrl, customerEmail, customerId, jobTitle } = body;

    console.log('Creating payment URL for:', { amount, currency, orderId, jobId });

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

    // Generate HMAC signature
    const timestamp = Date.now().toString();
    const clientRequestId = `CR-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create payment URL request payload for Fiserv Hosted Payment Page
    const paymentPayload = {
      requestType: 'PaymentURLRequest',
      transactionAmount: {
        total: amount,
        currency: currency || 'JMD'
      },
      transactionType: 'SALE',
      storeId: STORE_ID,
      orderId: orderId,
      billing: customerEmail ? { email: customerEmail } : undefined,
      transactionNotificationURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
      expiration: 86400000, // 24 hours in milliseconds
      authenticateTransaction: false,
      dynamicMerchantName: 'LawnConnect',
      hostedPaymentPageText: jobTitle ? `Payment for: ${jobTitle}` : 'LawnConnect Payment',
      redirectURL: successUrl,
      redirectURLPolicy: {
        redirectURL: successUrl,
        actionAfterResponse: 'REDIRECT'
      },
      failureURL: failureUrl
    };

    const payloadString = JSON.stringify(paymentPayload);
    
    // Create HMAC signature
    const messageToSign = apiKey + clientRequestId + timestamp + payloadString;
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

    console.log('Making Fiserv API request to create payment URL');

    // Call Fiserv API to create payment URL
    const fiservResponse = await fetch(`${FISERV_API_BASE_URL}/payment-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Client-Request-Id': clientRequestId,
        'Timestamp': timestamp,
        'Message-Signature': messageSignature,
      },
      body: payloadString
    });

    const responseText = await fiservResponse.text();
    console.log('Fiserv response status:', fiservResponse.status);
    console.log('Fiserv response:', responseText);

    if (!fiservResponse.ok) {
      console.error('Fiserv API error:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment URL',
          details: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fiservData = JSON.parse(responseText);

    // Store pending payment info in database for later verification
    if (jobId && customerId) {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // We'll track this payment attempt
      console.log('Payment URL created for job:', jobId, 'order:', orderId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: fiservData.paymentUrl || fiservData.redirectURL,
        orderId: orderId,
        transactionId: fiservData.ipgTransactionId || fiservData.transactionId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating payment URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
