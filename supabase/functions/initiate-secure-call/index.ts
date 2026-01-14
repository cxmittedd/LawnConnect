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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Missing Twilio configuration");
      return new Response(
        JSON.stringify({ error: "Calling service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Job ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the job details
    const { data: job, error: jobError } = await supabaseClient
      .from("job_requests")
      .select("id, customer_id, accepted_provider_id, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is a participant
    const isCustomer = user.id === job.customer_id;
    const isProvider = user.id === job.accepted_provider_id;

    if (!isCustomer && !isProvider) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this job" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check job status allows calling
    const allowedStatuses = ["accepted", "in_progress", "pending_completion"];
    if (!allowedStatuses.includes(job.status || "")) {
      return new Response(
        JSON.stringify({ error: "Calls are only allowed for active jobs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's phone number
    const { data: callerProfile, error: callerError } = await supabaseClient
      .from("profiles")
      .select("phone_number, first_name")
      .eq("id", user.id)
      .single();

    if (callerError || !callerProfile?.phone_number) {
      console.error("Caller phone not found:", callerError);
      return new Response(
        JSON.stringify({ error: "Your phone number is not set up. Please update your profile." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target's phone number
    const targetUserId = isCustomer ? job.accepted_provider_id : job.customer_id;
    const { data: targetProfile, error: targetError } = await supabaseClient
      .from("profiles")
      .select("phone_number, first_name")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile?.phone_number) {
      console.error("Target phone not found:", targetError);
      return new Response(
        JSON.stringify({ error: "The other party's phone number is not available." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone numbers to E.164
    const formatE164 = (phone: string): string => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length >= 11 && digits.startsWith("1")) {
        return `+${digits}`;
      }
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      return phone.startsWith("+") ? phone : `+${digits}`;
    };

    const isValidE164 = (phone: string): boolean => /^\+1\d{10}$/.test(phone);

    const callerPhoneE164 = formatE164(callerProfile.phone_number);
    const targetPhoneE164 = formatE164(targetProfile.phone_number);
    const twilioPhoneE164 = formatE164(twilioPhoneNumber);

    if (!isValidE164(callerPhoneE164)) {
      return new Response(
        JSON.stringify({ error: "Your phone number looks invalid. Please update it in Settings (use 876-XXX-XXXX)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidE164(targetPhoneE164)) {
      return new Response(
        JSON.stringify({ error: "The other party's phone number looks invalid. Ask them to update it in Settings before calling." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Initiating secure call:", {
      jobId,
      caller: user.id,
      callerPhone: callerPhoneE164,
      target: targetUserId,
      targetPhone: targetPhoneE164,
    });

    // Create TwiML URL that will connect to the target
    // We'll use a TwiML Bin-style approach by encoding the target in the URL
    const twimlUrl = `${supabaseUrl}/functions/v1/twilio-call-connect?target=${encodeURIComponent(targetPhoneE164)}&callerId=${encodeURIComponent(twilioPhoneE164)}&jobId=${encodeURIComponent(jobId)}`;

    // Initiate outbound call to the caller using Twilio REST API
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const callParams = new URLSearchParams();
    callParams.append("To", callerPhoneE164);
    callParams.append("From", twilioPhoneE164);
    callParams.append("Url", twimlUrl);
    callParams.append("Method", "GET");
    callParams.append("Timeout", "30");

    const callResponse = await fetch(twilioApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callParams.toString(),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error("Twilio API error:", errorText);
      
      // Parse Twilio error for user-friendly message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.code === 21214 || errorJson.code === 21215) {
          return new Response(
            JSON.stringify({ error: "Your phone number format is invalid. Please update it in your profile." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (errorJson.code === 21612 || errorJson.code === 21408) {
          return new Response(
            JSON.stringify({ error: "Cannot call this number. The destination may not be reachable." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        // Ignore parse error
      }

      return new Response(
        JSON.stringify({ error: "Failed to initiate call. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callData = await callResponse.json();
    console.log("Call initiated successfully:", callData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Call initiated! Your phone will ring shortly.",
        callSid: callData.sid,
        target: {
          userId: targetUserId,
          firstName: targetProfile.first_name ?? null,
          last4: targetPhoneE164.slice(-4),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
