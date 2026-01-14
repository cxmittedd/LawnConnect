import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Job ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if job exists and user is a participant
    const { data: job, error: jobError } = await supabaseClient
      .from("job_requests")
      .select("id, customer_id, accepted_provider_id, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is part of this job
    if (user.id !== job.customer_id && user.id !== job.accepted_provider_id) {
      return new Response(JSON.stringify({ error: "Not authorized for this job" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow proxy for accepted/in_progress jobs
    if (!["accepted", "in_progress", "pending_completion"].includes(job.status)) {
      return new Response(JSON.stringify({ error: "Job must be accepted to enable calling" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if proxy session already exists
    const { data: existingSession } = await supabaseClient
      .from("proxy_sessions")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "active")
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({ 
        proxyNumber: existingSession.twilio_proxy_number,
        expiresAt: existingSession.expires_at,
        message: "Existing session found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the Twilio phone number from secrets
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    if (!twilioPhoneNumber) {
      return new Response(JSON.stringify({ error: "Twilio phone number not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new proxy session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: newSession, error: insertError } = await supabaseClient
      .from("proxy_sessions")
      .insert({
        job_id: jobId,
        customer_id: job.customer_id,
        provider_id: job.accepted_provider_id,
        twilio_proxy_number: twilioPhoneNumber,
        expires_at: expiresAt.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create proxy session:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create proxy session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      proxyNumber: newSession.twilio_proxy_number,
      expiresAt: newSession.expires_at,
      message: "Proxy session created"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
