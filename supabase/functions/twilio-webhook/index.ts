import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to format phone number for comparison
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-+()]/g, "").slice(-10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;
    const messageSid = formData.get("MessageSid") as string;
    const body = formData.get("Body") as string; // For SMS

    console.log("Twilio webhook received:", { from, to, callSid, messageSid });

    // Verify the call/SMS is to our Twilio number
    if (!twilioPhoneNumber || normalizePhoneNumber(to) !== normalizePhoneNumber(twilioPhoneNumber)) {
      console.log("Call/SMS not to our Twilio number");
      return new Response(generateTwiMLResponse("This number is not in service."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Find the caller's phone in profiles to identify them
    const normalizedFrom = normalizePhoneNumber(from);
    
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, phone_number, user_role")
      .like("phone_number", `%${normalizedFrom}%`)
      .limit(1)
      .single();

    if (profileError || !callerProfile) {
      console.log("Caller not found in system:", normalizedFrom);
      return new Response(generateTwiMLResponse("Your phone number is not registered in our system."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Find an active proxy session for this user
    const { data: proxySession, error: sessionError } = await supabaseClient
      .from("proxy_sessions")
      .select("*, job_requests!inner(customer_id, accepted_provider_id, status)")
      .or(`customer_id.eq.${callerProfile.id},provider_id.eq.${callerProfile.id}`)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !proxySession) {
      console.log("No active proxy session for caller");
      return new Response(generateTwiMLResponse("No active job connection found. Please ensure you have an accepted job."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Determine the target (the other party)
    const isCustomer = callerProfile.id === proxySession.customer_id;
    const targetUserId = isCustomer ? proxySession.provider_id : proxySession.customer_id;

    // Get target's phone number
    const { data: targetProfile, error: targetError } = await supabaseClient
      .from("profiles")
      .select("phone_number")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile?.phone_number) {
      console.log("Target phone number not found");
      return new Response(generateTwiMLResponse("The other party's phone number is not available."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // For calls, forward to the target
    if (callSid) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now through LawnConnect secure line.</Say>
  <Dial callerId="${twilioPhoneNumber}">
    <Number>${targetProfile.phone_number}</Number>
  </Dial>
</Response>`;
      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // For SMS, forward to the target
    if (messageSid && body) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

      if (!twilioAccountSid || !twilioAuthToken) {
        console.error("Twilio credentials not configured");
        return new Response(generateTwiMLResponse("SMS forwarding unavailable."), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      // Send SMS via Twilio API
      const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const smsBody = new URLSearchParams();
      smsBody.append("From", twilioPhoneNumber);
      smsBody.append("To", targetProfile.phone_number);
      smsBody.append("Body", `[LawnConnect] ${body}`);

      const smsResponse = await fetch(twilioApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: smsBody.toString(),
      });

      if (!smsResponse.ok) {
        console.error("Failed to forward SMS:", await smsResponse.text());
      }

      // Return empty TwiML for SMS
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    return new Response(generateTwiMLResponse("Invalid request."), {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(generateTwiMLResponse("An error occurred. Please try again."), {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});

function generateTwiMLResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message}</Say>
  <Hangup/>
</Response>`;
}
