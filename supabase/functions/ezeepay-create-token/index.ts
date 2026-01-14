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

    const { amount, order_id, customer_email, customer_name, description }: TokenRequest = await req.json();

    if (!amount || !order_id || !customer_email) {
      throw new Error('Missing required fields: amount, order_id, customer_email');
    }

    const licenceKey = Deno.env.get('EZEEPAY_LICENCE_KEY');
    const site = Deno.env.get('EZEEPAY_SITE');

    if (!licenceKey || !site) {
      throw new Error('EzeePay credentials not configured');
    }

    // Get the project preview URL for callbacks
    const projectPreviewUrl = 'https://id-preview--d707b523-89ba-4b25-b85c-199e9d5645a9.lovable.app';
    const functionBaseUrl = `${supabaseUrl}/functions/v1`;
    
    // Create token request to EzeePay
    const tokenPayload = {
      amount: amount,
      currency: 'JMD',
      order_id: order_id,
      post_back_url: `${functionBaseUrl}/ezeepay-webhook`,
      return_url: `${projectPreviewUrl}/post-job?payment_complete=true&order_id=${order_id}`,
      cancel_url: `${projectPreviewUrl}/post-job?payment_cancelled=true`,
    };

    console.log('Requesting EzeePay token with payload:', tokenPayload);

    const tokenResponse = await fetch('https://api-test.ezeepayments.com/v1/custom_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'licence_key': licenceKey,
        'site': site,
      },
      body: JSON.stringify(tokenPayload),
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
