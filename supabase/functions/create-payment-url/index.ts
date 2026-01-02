import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fiserv Payment URL API endpoint
const FISERV_API_URL = Deno.env.get('FISERV_API_BASE_URL') || 'https://cert.api.firstdata.com/gateway/v2';

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
    const { amount, currency, orderId, jobId, successUrl, failureUrl, customerEmail, jobTitle } = body;

    console.log('Creating payment URL for:', { amount, currency, orderId, jobId });

    // Get Fiserv credentials from environment
    const apiKey = Deno.env.get('PAYMENT_GATEWAY_API_KEY');
    const apiSecret = Deno.env.get('PAYMENT_GATEWAY_API_SECRET');
    const storeId = Deno.env.get('FISERV_STORE_ID') || Deno.env.get('FISERV_MERCHANT_ID');

    if (!apiKey || !apiSecret) {
      console.error('Missing Fiserv API credentials');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate required headers for Fiserv API
    const timestamp = Date.now().toString();
    const clientRequestId = crypto.randomUUID();

    // Create the payment URL request payload per Fiserv documentation
    const paymentPayload = {
      transactionAmount: {
        total: amount.toFixed(2),
        currency: currency || 'JMD'
      },
      transactionType: 'SALE',
      transactionNotificationURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
      expiration: 86400, // 24 hours in seconds
      authenticateTransaction: true,
      dynamicMerchantName: 'LawnConnect',
      invoiceNumber: orderId,
      orderId: orderId,
      hostedPaymentPageText: jobTitle ? `Payment for: ${jobTitle}` : 'LawnConnect Job Payment',
      billing: customerEmail ? { email: customerEmail } : undefined,
      redirectionConfiguration: {
        successURL: successUrl,
        failURL: failureUrl
      }
    };

    const payloadString = JSON.stringify(paymentPayload);
    
    // Create HMAC-SHA256 signature per Fiserv documentation
    // Format: ApiKey + ClientRequestId + Timestamp + PayloadString
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
    const signatureArray = new Uint8Array(signature);
    const messageSignature = encodeBase64(signatureArray.buffer);

    console.log('Making Fiserv Payment URL API request');
    console.log('API URL:', `${FISERV_API_URL}/payment-url`);
    console.log('Store ID:', storeId);

    // Call Fiserv Payment URL API
    const fiservResponse = await fetch(`${FISERV_API_URL}/payment-url`, {
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
      
      // If Payment URL API fails, fall back to generating HPP form data
      // This allows the frontend to submit directly to Fiserv's HPP
      console.log('Falling back to HPP form generation...');
      
      const hppData = await generateHPPFormData({
        storeId: storeId || '',
        sharedSecret: apiSecret,
        amount,
        currency: currency || 'JMD',
        orderId,
        successUrl,
        failureUrl,
        jobTitle,
        customerEmail
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          useHPP: true,
          hppUrl: 'https://test.ipg-online.com/connect/gateway/processing',
          formData: hppData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fiservData = JSON.parse(responseText);

    // Store pending payment info for verification
    if (jobId) {
      console.log('Payment URL created for job:', jobId, 'order:', orderId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: fiservData.paymentUrl || fiservData.redirectionUrl,
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

// Generate HPP form data with hashExtended for direct form submission
async function generateHPPFormData(params: {
  storeId: string;
  sharedSecret: string;
  amount: number;
  currency: string;
  orderId: string;
  successUrl: string;
  failureUrl: string;
  jobTitle?: string;
  customerEmail?: string;
}) {
  const { storeId, sharedSecret, amount, currency, orderId, successUrl, failureUrl, jobTitle } = params;
  
  // Format datetime as required: YYYY:MM:DD-hh:mm:ss
  const now = new Date();
  const txndatetime = `${now.getFullYear()}:${String(now.getMonth() + 1).padStart(2, '0')}:${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  // Currency code mapping (ISO 4217 numeric)
  const currencyMap: Record<string, string> = {
    'JMD': '388',
    'USD': '840',
    'EUR': '978'
  };
  const currencyCode = currencyMap[currency] || '388';
  
  const chargetotal = amount.toFixed(2);
  const timezone = 'America/Jamaica';
  const txntype = 'sale';
  const paymentMethod = 'V'; // Visa/Card payment
  const checkoutoption = 'combinedpage';
  const transactionNotificationURL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`;
  
  // Create hashExtended string (alphabetical order of parameter names)
  // chargetotal|checkoutoption|currency|oid|paymentMethod|responseFailURL|responseSuccessURL|storename|timezone|transactionNotificationURL|txndatetime|txntype
  const stringToHash = `${chargetotal}|${checkoutoption}|${currencyCode}|${orderId}|${paymentMethod}|${failureUrl}|${successUrl}|${storeId}|${timezone}|${transactionNotificationURL}|${txndatetime}|${txntype}`;
  
  console.log('HPP hash string:', stringToHash);
  
  // Generate HMAC-SHA256 hash
  const encoder = new TextEncoder();
  const keyData = encoder.encode(sharedSecret);
  const messageData = encoder.encode(stringToHash);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);
  const hashExtended = encodeBase64(signatureArray.buffer);
  
  return {
    storename: storeId,
    txntype,
    timezone,
    txndatetime,
    hash_algorithm: 'HMACSHA256',
    hashExtended,
    chargetotal,
    currency: currencyCode,
    oid: orderId,
    paymentMethod,
    checkoutoption,
    responseSuccessURL: successUrl,
    responseFailURL: failureUrl,
    transactionNotificationURL,
    dynamicMerchantName: 'LawnConnect',
    invoiceNumber: orderId,
    comments: jobTitle || 'LawnConnect Job Payment'
  };
}