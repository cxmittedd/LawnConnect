import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildSignedPostbackUrl } from "../_shared/ezeepay-callback-token.ts";
import { serviceBasePrice } from "../_shared/lawn-pricing.ts";

interface RequestBody {
  schedule_id: string;
  amount: number;
  customer_email: string;
  customer_name?: string;
  description?: string;
  origin_url?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ezeepay-create-subscription START`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { schedule_id, customer_name, description, origin_url }: RequestBody = await req.json();

    if (!schedule_id) {
      throw new Error("Missing required field: schedule_id");
    }

    // The recurring amount is derived from the caller's own schedule using the
    // server price table — never from the request body.
    const { data: schedule, error: scheduleError } = await supabase
      .from("autopay_schedules")
      .select("id, customer_id, lawn_size, title, custom_price")
      .eq("id", schedule_id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (scheduleError || !schedule) {
      throw new Error("Autopay schedule not found");
    }

    // A quote-based schedule repeats the admin-agreed price; everything else
    // uses the standard server price table.
    const amount = Number(schedule.custom_price) > 0
      ? Number(schedule.custom_price)
      : serviceBasePrice(schedule.lawn_size, schedule.title);
    const customer_email = user.email!;
    if (!customer_email) throw new Error("Your account has no email address on file");
    if (!(amount > 0)) throw new Error("Amount must be greater than zero");

    const sandbox = Deno.env.get("EZEEPAY_SANDBOX_MODE") === "true";
    const sandboxLicenceKey = Deno.env.get("EZEEPAY_SANDBOX_LICENCE_KEY");
    const licenceKey = (sandbox && sandboxLicenceKey) || Deno.env.get("EZEEPAY_LICENCE_KEY");
    const productionSite = Deno.env.get("EZEEPAY_SITE");
    if (!licenceKey || !productionSite) throw new Error("EzeePay credentials not configured");

    // Sandbox environment expects the test site header per EzeePay docs
    const site = sandbox ? "https://test.com" : productionSite;

    const apiBase = sandbox
      ? "https://api-test.ezeepayments.com/v1.1"
      : "https://api.ezeepayments.com/v1.1";
    const checkoutUrl = sandbox
      ? "https://secure-test.ezeepayments.com"
      : "https://secure.ezeepayments.com";

    console.log(`[${requestId}] Mode: ${sandbox ? "SANDBOX" : "LIVE"}, API: ${apiBase}`);

    // Resolve return/cancel URLs (same logic as ezeepay-create-token)
    // For sandbox mode, redirect URLs should still point to the real site
    // so customers return to LawnConnect after checkout
    const normalizedSiteHost = (() => {
      try {
        return productionSite.startsWith("http") ? new URL(productionSite).hostname : productionSite;
      } catch {
        return productionSite;
      }
    })();
    const siteBaseUrl = `https://${normalizedSiteHost}`;
    let baseUrl = siteBaseUrl;
    try {
      if (origin_url) {
        const originHost = new URL(origin_url).hostname;
        if (originHost === normalizedSiteHost || originHost.endsWith(`.${normalizedSiteHost}`)) {
          baseUrl = origin_url;
        }
      }
    } catch { /* ignore */ }

    const functionBaseUrl = `${supabaseUrl}/functions/v1`;
    const orderId = `autopay-${schedule_id}`;
    // Signed postback URL so the webhook can prove the callback came from EzeePay
    const postBackUrl = await buildSignedPostbackUrl(`${functionBaseUrl}/ezeepay-webhook`, orderId);


    // Step 1: Create the subscription
    console.log(`[${requestId}] Creating subscription: amount=${amount}, frequency=monthly`);
    const subFormData = new URLSearchParams();
    subFormData.append("amount", amount.toString());
    subFormData.append("currency", "JMD");
    subFormData.append("frequency", "monthly");
    subFormData.append("description", description || `LawnConnect autopay`);
    subFormData.append("post_back_url", postBackUrl);
    subFormData.append("cancellation_notification_url", postBackUrl);

    const subResponse = await fetch(`${apiBase}/subscription/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "licence_key": licenceKey,
        "site": site,
      },
      body: subFormData.toString(),
    });

    const subData = await subResponse.json();
    console.log(`[${requestId}] Subscription response: status=${subData?.result?.status ?? 'unknown'}, message=${subData?.result?.message ?? ''}`);

    if (!subData.result || subData.result.status !== 1) {
      throw new Error(subData.result?.message || "Failed to create subscription");
    }

    const subscriptionId = subData.result.subscription_id;
    console.log(`[${requestId}] Subscription created: ${subscriptionId}`);

    // Step 2: Get transaction token for the initial charge
    console.log(`[${requestId}] Getting transaction token for initial charge`);
    const tokenFormData = new URLSearchParams();
    tokenFormData.append("amount", amount.toString());
    tokenFormData.append("currency", "JMD");
    tokenFormData.append("order_id", orderId);
    tokenFormData.append("post_back_url", postBackUrl);
    tokenFormData.append("return_url", `${baseUrl}/autopay?setup=complete&schedule_id=${schedule_id}`);
    tokenFormData.append("cancel_url", `${baseUrl}/autopay?setup=cancelled&schedule_id=${schedule_id}`);

    const tokenResponse = await fetch(`${apiBase}/custom_token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "licence_key": licenceKey,
        "site": site,
      },
      body: tokenFormData.toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log(`[${requestId}] Token response: status=${tokenData?.result?.status ?? 'unknown'}, message=${tokenData?.result?.message ?? ''}`);

    if (!tokenData.result || tokenData.result.status !== 1) {
      throw new Error(tokenData.result?.message || "Failed to generate payment token");
    }

    // Save subscription ID to the schedule
    await supabase
      .from("autopay_schedules")
      .update({
        ezeepay_subscription_id: String(subscriptionId),
        ezeepay_status: "pending",
      })
      .eq("id", schedule_id)
      .eq("customer_id", user.id);

    console.log(`[${requestId}] SUCCESS: subscription=${subscriptionId}, token generated`);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: String(subscriptionId),
        token: tokenData.result.token,
        checkout_url: checkoutUrl,
        payment_data: {
          platform: "custom",
          token: tokenData.result.token,
          amount: amount,
          currency: "JMD",
          order_id: orderId,
          email_address: customer_email,
          customer_name: customer_name || "",
          description: description || "LawnConnect autopay setup",
          recurring: "true",
          subscription_id: String(subscriptionId),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[create-subscription] FAILED: ${error instanceof Error ? error.message : error}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
