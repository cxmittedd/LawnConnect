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
    const jobId = url.searchParams.get("jobId") || "";

    // Parse the form data from Twilio's POST
    const formData = await req.formData();
    const dialCallStatus = formData.get("DialCallStatus") as string || "";
    const callSid = formData.get("CallSid") as string || "";
    const dialSipResponseCode = formData.get("DialSipResponseCode") as string || "";
    const dialCallSid = formData.get("DialCallSid") as string || "";

    console.log("twilio-call-status received:", {
      jobId,
      dialCallStatus,
      callSid,
      dialSipResponseCode,
      dialCallSid,
    });

    // Handle different dial outcomes
    const failedStatuses = ["busy", "no-answer", "failed", "canceled"];
    
    if (failedStatuses.includes(dialCallStatus)) {
      let message = "LawnConnect: ";
      
      switch (dialCallStatus) {
        case "busy":
          message += "The other party is on another call. Please try again later.";
          break;
        case "no-answer":
          message += "The other party didn't answer. Please try again later or send them a message.";
          break;
        case "canceled":
          message += "The call was cancelled.";
          break;
        case "failed":
          // This often means Twilio couldn't reach the number
          message += "We couldn't connect your call. Please verify the other party's phone number is correct in their profile.";
          console.log("Call failed - possible reasons: geographic permissions, invalid number, or carrier issue");
          break;
        default:
          message += "The call could not be completed.";
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Hangup/>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // For completed calls or other statuses, just hang up gracefully
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Error in twilio-call-status:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`,
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});