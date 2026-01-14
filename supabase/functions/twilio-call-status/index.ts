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
    const jobId = url.searchParams.get("jobId");

    // Parse form data from Twilio callback
    const formData = await req.formData();
    const dialCallStatus = formData.get("DialCallStatus") as string | null;
    const callSid = formData.get("CallSid") as string | null;

    console.log("twilio-call-status received:", { jobId, dialCallStatus, callSid });

    // If the dial didn't complete successfully, inform the caller
    if (dialCallStatus && dialCallStatus !== "completed") {
      let message = "We could not connect your call.";
      
      switch (dialCallStatus) {
        case "busy":
          message = "LawnConnect: The other party's line is busy. Please try again later.";
          break;
        case "no-answer":
          message = "LawnConnect: The other party did not answer. Please try again later.";
          break;
        case "failed":
          message = "LawnConnect: The call could not be completed. Please check the phone number is correct.";
          break;
        case "canceled":
          message = "LawnConnect: The call was canceled.";
          break;
        default:
          message = "LawnConnect: We could not connect your call. Please try again.";
          break;
      }

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Hangup/>
</Response>`,
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    // Call completed successfully, just end gracefully
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});
