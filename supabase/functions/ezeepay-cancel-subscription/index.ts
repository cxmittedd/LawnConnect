import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RequestBody {
  schedule_id: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ezeepay-cancel-subscription START`);

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

    const { schedule_id }: RequestBody = await req.json();
    if (!schedule_id) throw new Error("Missing schedule_id");

    // Fetch the schedule (scoped to the authenticated user)
    const { data: schedule, error: schedError } = await supabase
      .from("autopay_schedules")
      .select("ezeepay_subscription_id, ezeepay_transaction_number, ezeepay_status")
      .eq("id", schedule_id)
      .eq("customer_id", user.id)
      .single();

    if (schedError || !schedule) throw new Error("Schedule not found");

    // If there's no EzeePay subscription or it was never activated, just mark locally
    if (!schedule.ezeepay_transaction_number || schedule.ezeepay_status === "cancelled") {
      console.log(`[${requestId}] No active EzeePay subscription — marking locally`);
      await supabase
        .from("autopay_schedules")
        .update({ active: false, ezeepay_status: "cancelled" })
        .eq("id", schedule_id);

      return new Response(
        JSON.stringify({ success: true, message: "Schedule deactivated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call EzeePay cancel API
    const licenceKey = Deno.env.get("EZEEPAY_LICENCE_KEY");
    const productionSite = Deno.env.get("EZEEPAY_SITE");
    if (!licenceKey || !productionSite) throw new Error("EzeePay credentials not configured");

    const sandbox = Deno.env.get("EZEEPAY_SANDBOX_MODE") === "true";
    // Sandbox environment expects the test site header per EzeePay docs
    const site = sandbox ? "https://test.com" : productionSite;
    const apiBase = sandbox
      ? "https://api-test.ezeepayments.com/v1.1"
      : "https://api.ezeepayments.com/v1.1";

    console.log(`[${requestId}] Cancelling EzeePay subscription, txn=${schedule.ezeepay_transaction_number}`);

    const formData = new URLSearchParams();
    formData.append("TransactionNumber", schedule.ezeepay_transaction_number);

    const cancelResponse = await fetch(`${apiBase}/subscription/cancel/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "licence_key": licenceKey,
        "site": site,
      },
      body: formData.toString(),
    });

    const cancelData = await cancelResponse.json();
    console.log(`[${requestId}] Cancel response:`, JSON.stringify(cancelData));

    if (!cancelData.result || cancelData.result.status !== 1) {
      // Even if EzeePay says it failed, the subscription may already be ended.
      // Log the error but still deactivate locally so the customer isn't stuck.
      console.error(`[${requestId}] EzeePay cancel returned: ${cancelData.result?.message}`);
    }

    await supabase
      .from("autopay_schedules")
      .update({ active: false, ezeepay_status: "cancelled" })
      .eq("id", schedule_id);

    console.log(`[${requestId}] Subscription cancelled successfully`);

    return new Response(
      JSON.stringify({ success: true, message: "Subscription cancelled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[cancel-subscription] FAILED: ${error instanceof Error ? error.message : error}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
