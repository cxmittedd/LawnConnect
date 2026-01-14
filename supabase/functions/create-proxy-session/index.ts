import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Function to send notification email
async function sendSecureCallNotification(
  supabaseClient: any,
  recipientId: string,
  jobTitle: string,
  jobId: string,
  proxyNumber: string,
  enabledByName: string
) {
  try {
    // Get recipient email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(recipientId);
    
    if (userError || !userData?.user?.email) {
      console.error("Failed to get recipient email:", userError);
      return;
    }

    const recipientEmail = userData.user.email;
    const appUrl = "https://connectlawn.com";
    const jobUrl = `${appUrl}/job/${jobId}`;
    const logoUrl = "https://connectlawn.com/pwa-512x512.png";
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Calling Enabled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                
                <!-- Logo Header -->
                <tr>
                  <td align="center" style="padding: 32px 40px 16px 40px;">
                    <img src="${logoUrl}" alt="LawnConnect" width="80" height="80" style="display: block; border: 0;" />
                  </td>
                </tr>
                
                <!-- Title Banner -->
                <tr>
                  <td align="center" style="padding: 0 40px 24px 40px;">
                    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px 32px; border-radius: 12px; display: inline-block;">
                      <span style="font-size: 24px; margin-right: 8px;">📞</span>
                      <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Secure Calling Enabled</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
                      Secure calling has been enabled for the following job:
                    </p>
                    <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #16a34a; margin-bottom: 16px;">
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">${jobTitle}</p>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                      <strong>Enabled by:</strong> ${enabledByName}
                    </p>
                    <div style="background: #eff6ff; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af; font-weight: 600;">
                        📱 Secure Proxy Number:
                      </p>
                      <p style="margin: 0; font-size: 20px; color: #2563eb; font-weight: 700; letter-spacing: 1px;">
                        ${proxyNumber}
                      </p>
                    </div>
                    <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px; margin-bottom: 16px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                        How it works:
                      </p>
                      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #92400e;">
                        <li>Call or text this number to reach the other party</li>
                        <li>Your real phone number stays private</li>
                        <li>This connection expires after 7 days</li>
                      </ul>
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #71717a;">
                      You can find this number in the job chat at any time.
                    </p>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 0 40px 32px 40px;">
                    <a href="${jobUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      View Job
                    </a>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <div style="border-top: 1px solid #e4e4e7;"></div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px 40px 32px 40px; background-color: #fafafa; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #16a34a;">
                      LawnConnect
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #71717a;">
                      Jamaica's Premier Lawn Care Marketplace
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                      © ${currentYear} LawnConnect. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #a1a1aa;">
                      Questions? Contact us at <a href="mailto:officiallawnconnect@gmail.com" style="color: #16a34a;">officiallawnconnect@gmail.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: "LawnConnect <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Secure Calling Enabled for "${jobTitle}"`,
      html,
    });

    console.log(`Secure call notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Error sending secure call notification:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Job ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if job exists and user is a participant
    const { data: job, error: jobError } = await supabaseClient
      .from("job_requests")
      .select("id, title, customer_id, accepted_provider_id, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is part of this job
    if (user.id !== job.customer_id && user.id !== job.accepted_provider_id) {
      return new Response(JSON.stringify({ error: "Not authorized for this job" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow proxy for accepted/in_progress jobs
    if (!["accepted", "in_progress", "pending_completion"].includes(job.status)) {
      return new Response(JSON.stringify({ error: "Job must be accepted to enable calling" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if proxy session already exists
    const { data: existingSession } = await supabaseClient
      .from("proxy_sessions")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "active")
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({ 
        proxyNumber: existingSession.twilio_proxy_number,
        expiresAt: existingSession.expires_at,
        message: "Existing session found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the Twilio phone number from secrets
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    if (!twilioPhoneNumber) {
      return new Response(JSON.stringify({ error: "Twilio phone number not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new proxy session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: newSession, error: insertError } = await supabaseClient
      .from("proxy_sessions")
      .insert({
        job_id: jobId,
        customer_id: job.customer_id,
        provider_id: job.accepted_provider_id,
        twilio_proxy_number: twilioPhoneNumber,
        expires_at: expiresAt.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create proxy session:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create proxy session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the enabler's profile name
    const { data: enablerProfile } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, company_name")
      .eq("id", user.id)
      .single();

    const enablerName = enablerProfile?.first_name 
      ? `${enablerProfile.first_name} ${enablerProfile.last_name || ''}`.trim()
      : enablerProfile?.company_name || 'A user';

    // Determine the other party to notify
    const recipientId = user.id === job.customer_id 
      ? job.accepted_provider_id 
      : job.customer_id;

    // Send email notification to the other party
    if (recipientId) {
      await sendSecureCallNotification(
        supabaseClient,
        recipientId,
        job.title,
        jobId,
        twilioPhoneNumber,
        enablerName
      );
    }

    return new Response(JSON.stringify({ 
      proxyNumber: newSession.twilio_proxy_number,
      expiresAt: newSession.expires_at,
      message: "Proxy session created"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
