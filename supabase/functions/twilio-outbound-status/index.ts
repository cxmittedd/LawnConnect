import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Twilio status callback for the initial outbound call (To = caller).
 * This is purely for observability so we can see why a call didn't ring / failed.
 */
serve(async (req) => {
  // Twilio sends application/x-www-form-urlencoded
  if (req.method !== "POST") {
    return new Response(null, { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const payload = {
      jobId,
      callSid: params.get("CallSid"),
      callStatus: params.get("CallStatus"),
      to: params.get("To"),
      from: params.get("From"),
      direction: params.get("Direction"),
      apiVersion: params.get("ApiVersion"),
      errorCode: params.get("ErrorCode"),
      errorMessage: params.get("ErrorMessage"),
      timestamp: new Date().toISOString(),
    };

    console.log("twilio-outbound-status received:", payload);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("twilio-outbound-status error:", error);
    return new Response(null, { status: 200 });
  }
});