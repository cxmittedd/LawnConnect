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

    console.log("twilio-call-connect received:", { target, callerId, jobId });

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

    // Generate TwiML to connect the caller to the target
    // The caller has already answered (Twilio called them), now we dial the target
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-call-status?jobId=${encodeURIComponent(jobId || "")}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now through LawnConnect secure line. Please hold.</Say>
  <Dial callerId="${callerId}" timeout="30" answerOnBridge="true" action="${statusCallbackUrl}" method="POST">
    <Number>${target}</Number>
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
