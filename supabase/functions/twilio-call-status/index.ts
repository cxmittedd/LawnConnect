import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TwilioCallDetails = {
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  error_code?: number | null;
  error_message?: string | null;
};

const fetchTwilioCallDetails = async (callSid: string): Promise<TwilioCallDetails | null> => {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!twilioAccountSid || !twilioAuthToken) return null;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.log("twilio-call-status: failed to fetch dial leg details", { callSid, status: res.status, body: txt });
      return null;
    }

    const json = (await res.json()) as TwilioCallDetails;
    return json;
  } catch (e) {
    console.log("twilio-call-status: error fetching dial leg details", { callSid, error: String(e) });
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId") || "";

    // Twilio posts application/x-www-form-urlencoded
    const formData = await req.formData();
    const dialCallStatus = (formData.get("DialCallStatus") as string) || "";
    const callSid = (formData.get("CallSid") as string) || "";
    const dialSipResponseCode = (formData.get("DialSipResponseCode") as string) || "";
    const dialCallSid = (formData.get("DialCallSid") as string) || "";

    console.log("twilio-call-status received:", {
      jobId,
      dialCallStatus,
      callSid,
      dialSipResponseCode,
      dialCallSid,
    });

    const failedStatuses = ["busy", "no-answer", "failed", "canceled"];

    if (failedStatuses.includes(dialCallStatus)) {
      // Optional: fetch dial leg details from Twilio so we can tell WHY it failed.
      const dialDetails = dialCallSid ? await fetchTwilioCallDetails(dialCallSid) : null;
      const errorCode = dialDetails?.error_code ?? null;

      console.log("twilio-call-status dial leg details:", {
        dialCallSid,
        errorCode,
        errorMessage: dialDetails?.error_message ?? null,
        to: dialDetails?.to ?? null,
        from: dialDetails?.from ?? null,
        status: dialDetails?.status ?? null,
      });

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
        case "failed": {
          // In practice this is usually not a formatting issue (we validate E.164 already).
          // More common: destination not reachable, geo permissions, trial account restrictions, or carrier errors.
          if (errorCode === 21215 || errorCode === 21214) {
            message += "We couldn't place the call because the destination number format looks invalid. Ask the other party to update their phone number in Settings.";
          } else if (errorCode === 21612 || errorCode === 21408) {
            message += "We couldn't reach that number right now. Please try again later.";
          } else if (errorCode) {
            message += "We couldn't connect your call due to carrier/network restrictions. Please try again later.";
          } else {
            message += "We couldn't connect your call. This is usually caused by calling permissions (e.g., destination country not enabled) or a trial-account limitation.";
          }
          break;
        }
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
