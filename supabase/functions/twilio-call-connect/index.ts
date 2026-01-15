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
  <Say voice="alice">LawnConnect: Sorry, there was an error setting up your call.</Say>
  <Hangup/>
</Response>`,
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const xmlEscapeAttr = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-call-status?jobId=${encodeURIComponent(jobId || "")}`;

    // Simple TwiML: greet the caller, then dial the target
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice">LawnConnect: Please hold while we connect your call.</Say>
  <Dial callerId="${xmlEscapeAttr(callerId)}" timeout="30" action="${xmlEscapeAttr(statusCallbackUrl)}" method="POST">
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
  <Say voice="alice">LawnConnect: Sorry, there was an error. Please try again.</Say>
  <Hangup/>
</Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});