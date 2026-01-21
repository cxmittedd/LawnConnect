import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  amount: number;
  order_id: string;
  customer_email: string;
  customer_name?: string;
  description?: string;
  origin_url?: string; // The URL where the payment was initiated from
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`[${requestId}] ========== EZEEPAY TOKEN REQUEST START ==========`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`[${requestId}] Method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] ERROR: Missing authorization header`);
      throw new Error('Missing authorization header');
    }
    console.log(`[${requestId}] Auth header present: ${authHeader.substring(0, 20)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`[${requestId}] ERROR: Auth failed -`, authError?.message || 'No user');
      throw new Error('Unauthorized');
    }
    console.log(`[${requestId}] Authenticated user: ${user.id} (${user.email})`);

    const { amount, order_id, customer_email, customer_name, description, origin_url }: TokenRequest = await req.json();

    console.log(`[${requestId}] Payment request details:`);
    console.log(`[${requestId}]   - Order ID: ${order_id}`);
    console.log(`[${requestId}]   - Amount: J$${amount}`);
    console.log(`[${requestId}]   - Customer: ${customer_email}`);
    console.log(`[${requestId}]   - Origin: ${origin_url}`);

    if (!amount || !order_id || !customer_email) {
      console.error(`[${requestId}] ERROR: Missing required fields`);
      throw new Error('Missing required fields: amount, order_id, customer_email');
    }

    if (amount <= 0) {
      console.error(`[${requestId}] ERROR: Invalid amount: ${amount}`);
      throw new Error('Amount must be greater than zero');
    }

    const licenceKey = Deno.env.get('EZEEPAY_LICENCE_KEY');
    const site = Deno.env.get('EZEEPAY_SITE');

    if (!licenceKey || !site) {
      console.error(`[${requestId}] ERROR: EzeePay credentials not configured`);
      throw new Error('EzeePay credentials not configured');
    }
    console.log(`[${requestId}] EzeePay config: site=${site}, key=${licenceKey.substring(0, 4)}...`);

    // EzeePay validates that return/cancel URLs match the registered `site`.
    // If the payment is initiated from a preview domain, we must still use the
    // production site domain for redirects, otherwise EzeePay returns
    // "invalid site address".
    const normalizedSiteHost = (() => {
      try {
        return site.startsWith('http') ? new URL(site).hostname : site;
      } catch {
        return site;
      }
    })();

    const siteBaseUrl = `https://${normalizedSiteHost}`;

    let baseUrl = siteBaseUrl;
    try {
      if (origin_url) {
        const originHost = new URL(origin_url).hostname;
        // Only allow origin_url when it matches the registered site.
        if (originHost === normalizedSiteHost || originHost.endsWith(`.${normalizedSiteHost}`)) {
          baseUrl = origin_url;
        }
      }
    } catch {
      // ignore invalid origin_url
    }
    const functionBaseUrl = `${supabaseUrl}/functions/v1`;
    
    console.log(`[${requestId}] Redirect URLs:`);
    console.log(`[${requestId}]   - Origin: ${origin_url || 'N/A'}`);
    console.log(`[${requestId}]   - Site Host: ${normalizedSiteHost}`);
    console.log(`[${requestId}]   - Base URL: ${baseUrl}`);
    console.log(`[${requestId}]   - Webhook: ${functionBaseUrl}/ezeepay-webhook`);
    
    // Create form data for EzeePay (API expects form-urlencoded, not JSON)
    const formData = new URLSearchParams();
    formData.append('amount', amount.toString());
    formData.append('currency', 'JMD');
    formData.append('order_id', order_id);
    formData.append('post_back_url', `${functionBaseUrl}/ezeepay-webhook`);
    formData.append('return_url', `${baseUrl}/post-job?payment_complete=true&order_id=${order_id}`);
    formData.append('cancel_url', `${baseUrl}/post-job?payment_cancelled=true&order_id=${order_id}`);

    console.log(`[${requestId}] Calling EzeePay API: https://api.ezeepayments.com/v1/custom_token/`);
    const apiStartTime = Date.now();

    const tokenResponse = await fetch('https://api.ezeepayments.com/v1/custom_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'licence_key': licenceKey,
        'site': site,
      },
      body: formData.toString(),
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`[${requestId}] EzeePay API response: status=${tokenResponse.status}, duration=${apiDuration}ms`);

    const tokenData = await tokenResponse.json();
    console.log(`[${requestId}] EzeePay response:`, JSON.stringify(tokenData));

    if (!tokenData.result || tokenData.result.status !== 1) {
      const errorMsg = tokenData.result?.message || 'Failed to generate payment token';
      console.error(`[${requestId}] ERROR: EzeePay token generation failed - ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] SUCCESS: Token generated successfully`);
    console.log(`[${requestId}]   - Token: ${tokenData.result.token.substring(0, 10)}...`);
    console.log(`[${requestId}]   - Payment URL: https://secure.ezeepayments.com`);
    console.log(`[${requestId}] Total processing time: ${totalDuration}ms`);
    console.log(`[${requestId}] ========== EZEEPAY TOKEN REQUEST END ==========`);

    // Return token and payment URL
    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData.result.token,
        payment_url: 'https://secure.ezeepayments.com',
        payment_data: {
          platform: 'custom',
          token: tokenData.result.token,
          amount: amount,
          currency: 'JMD',
          order_id: order_id,
          email_address: customer_email,
          customer_name: customer_name || '',
          description: description || `Payment for job ${order_id}`,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`[${requestId}] Stack:`, error instanceof Error ? error.stack : 'N/A');
    console.log(`[${requestId}] Total processing time: ${totalDuration}ms`);
    console.log(`[${requestId}] ========== EZEEPAY TOKEN REQUEST END (ERROR) ==========`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment initialization failed' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
