import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("target");
    const callerId = url.searchParams.get("callerId");
    const jobId = url.searchParams.get("jobId");
    const callerRole = url.searchParams.get("callerRole"); // "customer" or "provider"
    const forRecipient = url.searchParams.get("forRecipient"); // "true" if this is for the recipient greeting

    console.log("twilio-call-connect received:", { target, callerId, jobId, callerRole, forRecipient });

    if (!target || !callerId) {
      console.error("Missing required parameters");
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error setting up your call.</Say>
  <Hangup/>
</Response>`,
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    // If this is a request for the recipient's greeting (when they answer)
    if (forRecipient === "true") {
      // Recipient hears the opposite role - if caller is customer, recipient is provider and vice versa
      const recipientHears = callerRole === "customer" ? "customer" : "service provider";
      const recipientTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Say voice="alice">Thank you for calling LawnConnect. Please hold while we securely connect you to your ${recipientHears}.</Say>
</Response>`;
      console.log("Returning recipient greeting TwiML:", recipientTwiml);
      return new Response(recipientTwiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Generate TwiML to connect the caller to the target
    // The caller has already answered (Twilio called them), now we dial the target
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-call-status?jobId=${encodeURIComponent(jobId || "")}`;
    
    // URL for the recipient's greeting when they answer
    const recipientGreetingUrl = `${supabaseUrl}/functions/v1/twilio-call-connect?target=${encodeURIComponent(target)}&callerId=${encodeURIComponent(callerId)}&jobId=${encodeURIComponent(jobId || "")}&callerRole=${encodeURIComponent(callerRole || "")}&forRecipient=true`;

    // Caller message - if caller is customer, they're calling their service provider
    const callerHears = callerRole === "customer" ? "service provider" : "customer";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Say voice="alice">Thank you for calling LawnConnect. Please hold while we securely connect you to your ${callerHears}.</Say>
  <Dial callerId="${callerId}" timeout="30" answerOnBridge="true" action="${statusCallbackUrl}" method="POST">
    <Number url="${recipientGreetingUrl}">${target}</Number>
  </Dial>
</Response>`;

    console.log("Returning TwiML:", twiml);

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error. Please try again.</Say>
  <Hangup/>
</Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});
