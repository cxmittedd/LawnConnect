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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { amount, order_id, customer_email, customer_name, description, origin_url }: TokenRequest = await req.json();

    if (!amount || !order_id || !customer_email) {
      throw new Error('Missing required fields: amount, order_id, customer_email');
    }

    const licenceKey = Deno.env.get('EZEEPAY_LICENCE_KEY');
    const site = Deno.env.get('EZEEPAY_SITE');

    if (!licenceKey || !site) {
      throw new Error('EzeePay credentials not configured');
    }

    // Use the origin URL from the request, or fall back to known URLs
    // This ensures users are redirected back to the same domain they started from
    const baseUrl = origin_url || 'https://client-vault-pro.lovable.app';
    const functionBaseUrl = `${supabaseUrl}/functions/v1`;
    
    console.log('Using base URL for redirects:', baseUrl);
    
    // Create form data for EzeePay (API expects form-urlencoded, not JSON)
    const formData = new URLSearchParams();
    formData.append('amount', amount.toString());
    formData.append('currency', 'JMD');
    formData.append('order_id', order_id);
    formData.append('post_back_url', `${functionBaseUrl}/ezeepay-webhook`);
    formData.append('return_url', `${baseUrl}/post-job?payment_complete=true&order_id=${order_id}`);
    formData.append('cancel_url', `${baseUrl}/post-job?payment_cancelled=true&order_id=${order_id}`);

    console.log('Requesting EzeePay token with form data:', Object.fromEntries(formData));

    const tokenResponse = await fetch('https://api-test.ezeepayments.com/v1/custom_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'licence_key': licenceKey,
        'site': site,
      },
      body: formData.toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('EzeePay token response:', tokenData);

    if (!tokenData.result || tokenData.result.status !== 1) {
      throw new Error(tokenData.result?.message || 'Failed to generate payment token');
    }

    // Return token and payment URL
    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData.result.token,
        payment_url: 'https://secure-test.ezeepayments.com',
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
    console.error('EzeePay token creation error:', error);
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
