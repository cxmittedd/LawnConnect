import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "view");
    const token = String(body?.token ?? "").trim();

    if (!/^[A-Za-z0-9]{6,40}$/.test(token)) {
      return json({ success: false, error: "Invalid quote link" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: quote, error: quoteError } = await serviceClient
      .from("custom_quotes")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (quoteError || !quote) {
      return json({ success: false, error: "This quote link is not valid" }, 404);
    }

    const publicQuote = {
      title: quote.title,
      description: quote.description,
      parish: quote.parish,
      community: quote.community,
      location: quote.location,
      lawn_size: quote.lawn_size,
      price: Number(quote.price),
      status: quote.status,
      job_id: quote.job_id,
      customer_name: quote.customer_name,
    };

    if (action === "view") {
      return json({ success: true, quote: publicQuote });
    }

    if (action !== "claim") {
      return json({ success: false, error: "Unknown action" }, 400);
    }

    // Claiming requires a signed-in account.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Please sign in to continue" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ success: false, error: "Please sign in to continue" }, 401);

    if (quote.status === "cancelled") {
      return json({ success: false, error: "This quote is no longer available" }, 400);
    }

    // Already claimed: only the same account may continue with it.
    if (quote.job_id) {
      if (quote.claimed_by && quote.claimed_by !== user.id) {
        return json({ success: false, error: "This quote has already been claimed" }, 403);
      }
      return json({ success: true, job_id: quote.job_id, quote: publicQuote });
    }

    const price = Number(quote.price);
    const { data: job, error: jobError } = await serviceClient
      .from("job_requests")
      .insert({
        customer_id: user.id,
        title: quote.title,
        description: quote.description,
        parish: quote.parish,
        community: quote.community,
        location: quote.location,
        lawn_size: quote.lawn_size,
        base_price: price,
        final_price: price,
        platform_fee: Math.round(price * 0.3 * 100) / 100,
        provider_payout: Math.round(price * 0.7 * 100) / 100,
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error(`[${requestId}] Failed to create quote booking: ${jobError?.message}`);
      return json({ success: false, error: "Could not start this booking" }, 500);
    }

    await serviceClient
      .from("custom_quotes")
      .update({
        status: "claimed",
        job_id: job.id,
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", quote.id)
      .is("job_id", null);

    console.log(`[${requestId}] Quote claimed, booking created`);
    return json({ success: true, job_id: job.id, quote: publicQuote });
  } catch (error) {
    console.error(`[${requestId}] custom-quote failed: ${error instanceof Error ? error.message : error}`);
    return json({ success: false, error: "Something went wrong" }, 500);
  }
});
