import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to format phone number for comparison - extract last 10 digits
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, "");
  // Return last 10 digits (handles +1, 1, or no country code)
  return digitsOnly.slice(-10);
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
    const dialCallStatus = (formData.get("DialCallStatus") as string | null) ?? null;
    const dialCallSid = (formData.get("DialCallSid") as string | null) ?? null;

    console.log("Twilio webhook received:", { from, to, callSid, messageSid, dialCallStatus, dialCallSid });

    // Verify the call/SMS is to our Twilio number
    if (!twilioPhoneNumber || normalizePhoneNumber(to) !== normalizePhoneNumber(twilioPhoneNumber)) {
      console.log("Call/SMS not to our Twilio number");
      return new Response(generateTwiMLResponse("This number is not in service."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Find the caller's phone in profiles to identify them
    const normalizedFrom = normalizePhoneNumber(from);
    console.log("Looking for caller with normalized phone:", normalizedFrom);
    
    // Get all profiles with phone numbers and find matching one
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, phone_number, user_role")
      .not("phone_number", "is", null);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return new Response(generateTwiMLResponse("An error occurred. Please try again."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Find caller by comparing normalized phone numbers
    const callerProfile = profiles?.find(p => 
      p.phone_number && normalizePhoneNumber(p.phone_number) === normalizedFrom
    );

    if (!callerProfile) {
      console.log("Caller not found in system:", normalizedFrom, "Available phones:", profiles?.map(p => p.phone_number));
      return new Response(generateTwiMLResponse("Your phone number is not registered in our system."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }
    
    console.log("Found caller:", callerProfile.id);

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

    // Use the proxy number stored on the session (falls back to env)
    const proxyCallerId = proxySession.twilio_proxy_number || twilioPhoneNumber;

    // If Twilio is calling us back after a <Dial>, report the result
    if (dialCallStatus && callSid) {
      console.log("Dial finished with status:", dialCallStatus);

      // When Twilio provides the child call SID, fetch details for logging (helps diagnose carrier/trial/format issues)
      if (dialCallStatus !== "completed" && dialCallSid) {
        try {
          const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

          if (twilioAccountSid && twilioAuthToken) {
            const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
            const callDetailsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${dialCallSid}.json`;
            const resp = await fetch(callDetailsUrl, {
              headers: { Authorization: `Basic ${auth}` },
            });

            if (resp.ok) {
              const details = await resp.json();
              console.log("Dial failed details:", {
                dialCallSid,
                status: details?.status,
                error_code: details?.error_code,
                error_message: details?.error_message,
                to: details?.to,
                from: details?.from,
              });
            } else {
              console.log("Failed to fetch Twilio call details:", await resp.text());
            }
          }
        } catch (e) {
          console.log("Error fetching Twilio call details:", e);
        }
      }

      if (dialCallStatus !== "completed") {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We could not connect your call. Please confirm the other party can receive calls and that their phone number is correct in the app.</Say>
  <Hangup/>
</Response>`,
          { headers: { ...corsHeaders, "Content-Type": "text/xml" } },
        );
      }

      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Get target's phone number
    const { data: targetProfile, error: targetError } = await supabaseClient
      .from("profiles")
      .select("phone_number")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile?.phone_number) {
      console.log("Target phone number not found for user:", targetUserId);
      return new Response(generateTwiMLResponse("The other party's phone number is not available."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Format phone number to E.164 format for Twilio
    const formatE164 = (phone: string): string => {
      const digits = phone.replace(/\D/g, "");
      // If already has country code (11+ digits starting with 1), add +
      if (digits.length >= 11 && digits.startsWith("1")) {
        return `+${digits}`;
      }
      // Otherwise assume Jamaica (+1) country code
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      // Return with + prefix if not already there
      return phone.startsWith("+") ? phone : `+${digits}`;
    };

    const targetPhoneE164 = formatE164(targetProfile.phone_number);
    const proxyCallerIdE164 = proxyCallerId ? formatE164(proxyCallerId) : undefined;

    console.log("Forwarding call to:", targetPhoneE164, "callerId:", proxyCallerIdE164);

    // For calls, forward to the target
    if (callSid) {
      // Twilio requires a publicly reachable HTTPS callback URL
      const actionUrl = `${supabaseUrl}/functions/v1/twilio-webhook`;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now through LawnConnect secure line.</Say>
  <Dial action="${actionUrl}" method="POST" timeout="25" answerOnBridge="true" callerId="${proxyCallerIdE164 || twilioPhoneNumber}">
    <Number>${targetPhoneE164}</Number>
  </Dial>
</Response>`;
      console.log("Returning TwiML:", twiml);
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
      smsBody.append("From", proxyCallerIdE164 || twilioPhoneNumber);
      smsBody.append("To", targetPhoneE164);
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
