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
  type: z.enum(['proposal_received', 'proposal_accepted', 'payment_submitted', 'payment_confirmed', 'job_completed', 'review_received', 'late_completion_warning', 'late_completion_apology', 'completion_confirmation_needed', 'dispute_opened', 'dispute_response']),
  recipientId: z.string().uuid(),
  jobTitle: z.string().min(1).max(200),
  jobId: z.string().uuid(),
  additionalData: z.object({
    providerName: z.string().max(100).optional(),
    customerName: z.string().max(100).optional(),
    amount: z.number().positive().optional(),
    rating: z.number().min(1).max(5).optional(),
    lateJobsThisMonth: z.number().optional(),
    preferredDate: z.string().optional(),
    disputeReason: z.string().max(500).optional(),
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

    case 'late_completion_warning':
      return {
        subject: `Late Completion Warning: "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
              <h1>⚠️ Late Completion Warning</h1>
            </div>
            <div class="content">
              <p>You have completed the following job after its preferred date:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.preferredDate ? `<p><strong>Original Due Date:</strong> ${additionalData.preferredDate}</p>` : ''}
              ${additionalData?.lateJobsThisMonth ? `<p><strong>Late jobs this month:</strong> ${additionalData.lateJobsThisMonth}/3</p>` : ''}
              <p style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong>⚠️ Important:</strong> If you accumulate 3 or more late completions in a calendar month, you may lose certain benefits including:
                <ul style="margin-top: 10px;">
                  <li>Priority listing in search results</li>
                  <li>Featured provider badge</li>
                  <li>Reduced platform fees</li>
                </ul>
              </p>
              <p style="margin-top: 15px;">Please try to complete jobs by their preferred date to maintain your standing.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'late_completion_apology':
      return {
        subject: `Apology: Your Job "${jobTitle}" Was Completed Late`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
              <h1>📝 We Apologize</h1>
            </div>
            <div class="content">
              <p>We sincerely apologize that your job was completed after the preferred date:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.preferredDate ? `<p><strong>Your Preferred Date:</strong> ${additionalData.preferredDate}</p>` : ''}
              ${additionalData?.providerName ? `<p><strong>Provider:</strong> ${additionalData.providerName}</p>` : ''}
              <p style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin-top: 15px;">
                We understand the inconvenience this may have caused and we're taking steps to ensure our providers meet their commitments on time.
              </p>
              <p style="margin-top: 15px;">We value your business and hope you'll continue using LawnConnect. If you have any concerns, please don't hesitate to contact us.</p>
              <p style="margin-top: 10px;">Thank you for your patience and understanding.</p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
              <p style="margin-top: 5px;">Contact us: support@lawnconnect.jm</p>
            </div>
          </div>
        `
      };

    case 'completion_confirmation_needed':
      return {
        subject: `Please Confirm Job Completion: "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
              <h1>✅ Action Required</h1>
            </div>
            <div class="content">
              <p>Your lawn service provider has marked the following job as complete:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.providerName ? `<p><strong>Provider:</strong> ${additionalData.providerName}</p>` : ''}
              <p style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong>Please review the before and after photos and either:</strong>
                <ul style="margin-top: 10px;">
                  <li><strong>Confirm Completion</strong> - if you're satisfied with the work</li>
                  <li><strong>Report an Issue</strong> - if there are problems that need addressing</li>
                </ul>
              </p>
              <p style="margin-top: 15px; font-size: 14px; color: #666;">
                If you don't respond within 30 hours, the job will be automatically marked as complete.
              </p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'dispute_opened':
      return {
        subject: `Dispute Filed: "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
              <h1>⚠️ Dispute Filed</h1>
            </div>
            <div class="content">
              <p>A customer has filed a dispute for the following job:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.customerName ? `<p><strong>Customer:</strong> ${additionalData.customerName}</p>` : ''}
              ${additionalData?.disputeReason ? `<p><strong>Reason:</strong> ${additionalData.disputeReason}</p>` : ''}
              <p style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong>What you need to do:</strong>
                <ul style="margin-top: 10px;">
                  <li>Review the customer's photos and explanation</li>
                  <li>Respond with your own photos and notes</li>
                  <li>Address any issues and re-submit completion</li>
                </ul>
              </p>
              <p style="margin-top: 15px; font-size: 14px; color: #666;">
                Note: Accumulating 3 or more disputes in a month will reduce your payout percentage from 70% to 60%.
              </p>
            </div>
            <div class="footer">
              <p>LawnConnect - Connecting Jamaica's Lawn Care Community</p>
            </div>
          </div>
        `
      };

    case 'dispute_response':
      return {
        subject: `Provider Response to Dispute: "${jobTitle}"`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
              <h1>💬 Dispute Response</h1>
            </div>
            <div class="content">
              <p>The provider has responded to your dispute for:</p>
              <h2>${jobTitle}</h2>
              ${additionalData?.providerName ? `<p><strong>Provider:</strong> ${additionalData.providerName}</p>` : ''}
              <p style="margin-top: 15px;">Please log in to LawnConnect to view their response, photos, and notes. You can then confirm completion or continue the dispute if needed.</p>
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a service role call (internal/cron job) - allow bypass
    const authHeader = req.headers.get("authorization");
    const isServiceRoleCall = authHeader?.includes(supabaseServiceKey);

    let callerId: string | null = null;

    // If not a service role call, validate the user's JWT
    if (!isServiceRoleCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        console.error("Missing or invalid authorization header");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("Failed to authenticate user:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      callerId = user.id;
      console.log(`Authenticated user: ${callerId}`);
    } else {
      console.log("Service role call detected - bypassing user auth check");
    }

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

    // Verify job exists and caller is a participant (unless service role call)
    if (!isServiceRoleCall && callerId) {
      const { data: job, error: jobError } = await supabase
        .from("job_requests")
        .select("customer_id, accepted_provider_id")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        console.error("Job not found:", jobError);
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify caller is a participant in this job
      const isCustomer = job.customer_id === callerId;
      const isProvider = job.accepted_provider_id === callerId;

      if (!isCustomer && !isProvider) {
        console.error(`User ${callerId} is not a participant in job ${jobId}`);
        return new Response(
          JSON.stringify({ error: "Forbidden - you are not a participant in this job" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify recipient is the other participant in the job
      const validRecipient = recipientId === job.customer_id || recipientId === job.accepted_provider_id;
      if (!validRecipient) {
        console.error(`Recipient ${recipientId} is not a participant in job ${jobId}`);
        return new Response(
          JSON.stringify({ error: "Forbidden - invalid recipient for this job" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

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
