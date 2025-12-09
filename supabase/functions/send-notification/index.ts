import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for input validation
const notificationSchema = z.object({
  type: z.enum(['proposal_received', 'proposal_accepted', 'payment_submitted', 'payment_confirmed', 'job_completed', 'review_received']),
  recipientId: z.string().uuid(),
  jobTitle: z.string().min(1).max(200),
  jobId: z.string().uuid(),
  additionalData: z.object({
    providerName: z.string().max(100).optional(),
    customerName: z.string().max(100).optional(),
    amount: z.number().positive().optional(),
    rating: z.number().min(1).max(5).optional(),
  }).optional(),
});

type NotificationRequest = z.infer<typeof notificationSchema>;

const getEmailContent = (type: string, jobTitle: string, additionalData?: NotificationRequest['additionalData']) => {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
  `;

  switch (type) {
    case 'proposal_received':
      return {
        subject: `New Proposal for "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>🎉 New Proposal Received!</h1>
            </div>
            <div class="content">
              <p>Great news! A lawn care provider has submitted a proposal for your job:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.providerName ? `<p><strong>Provider:</strong> ${additionalData.providerName}</p>` : ''}
              ${additionalData?.amount ? `<p><strong>Proposed Price:</strong> J$${additionalData.amount.toFixed(2)}</p>` : ''}
              <p>Log in to LawnConnect to view the full proposal and accept or decline.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'proposal_accepted':
      return {
        subject: `Your Proposal for "${jobTitle}" Was Accepted!`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>✅ Proposal Accepted!</h1>
            </div>
            <div class="content">
              <p>Congratulations! Your proposal has been accepted for:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.customerName ? `<p><strong>Customer:</strong> ${additionalData.customerName}</p>` : ''}
              ${additionalData?.amount ? `<p><strong>Agreed Price:</strong> J$${additionalData.amount.toFixed(2)}</p>` : ''}
              <p>The customer will now make payment via Lynk. You'll receive a notification once payment is confirmed.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'payment_submitted':
      return {
        subject: `Payment Submitted for "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>💰 Payment Submitted!</h1>
            </div>
            <div class="content">
              <p>A customer has submitted payment for:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.amount ? `<p><strong>Amount:</strong> J$${additionalData.amount.toFixed(2)}</p>` : ''}
              <p>Please check your Lynk app to verify the payment and confirm receipt in LawnConnect.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'payment_confirmed':
      return {
        subject: `Payment Confirmed for "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>✅ Payment Confirmed!</h1>
            </div>
            <div class="content">
              <p>Great news! Payment has been confirmed for:</p>
              <h2>${jobTitle}</h2>
              <p>The provider will now begin work on your lawn. You'll be notified when they mark the job as complete.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'job_completed':
      return {
        subject: `Job Marked Complete: "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>🏁 Job Marked Complete!</h1>
            </div>
            <div class="content">
              <p>The provider has marked the following job as complete:</p>
              <h2>${jobTitle}</h2>
              <p>Please review the work and confirm completion in LawnConnect. Don't forget to leave a review!</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'review_received':
      return {
        subject: `You Received a Review!`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>⭐ New Review!</h1>
            </div>
            <div class="content">
              <p>You have received a review for:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.rating ? `<p><strong>Rating:</strong> ${'⭐'.repeat(additionalData.rating)} (${additionalData.rating}/5)</p>` : ''}
              <p>Log in to LawnConnect to see the full review.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    default:
      return {
        subject: `LawnConnect Notification`,
        html: `<p>You have a new notification from LawnConnect.</p>`
      };
  }
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body with zod
    const body = await req.json();
    const parseResult = notificationSchema.safeParse(body);
    
    if (!parseResult.success) {
      console.error("Invalid request body:", parseResult.error.format());
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parseResult.error.format() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, recipientId, jobTitle, jobId, additionalData } = parseResult.data;

    console.log(`Processing ${type} notification for recipient ${recipientId}, job: ${jobTitle}`);

    // Get recipient email from profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user email from auth.users via admin API
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientId);

    if (userError || !userData?.user?.email) {
      console.error("Failed to get user email:", userError);
      return new Response(
        JSON.stringify({ error: "Recipient email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const recipientEmail = userData.user.email;
    console.log(`Sending email to: ${recipientEmail}`);

    const { subject, html } = getEmailContent(type, jobTitle, additionalData);

    const emailResponse = await resend.emails.send({
      from: "LawnConnect <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
