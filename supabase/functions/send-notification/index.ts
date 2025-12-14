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

// Branded email wrapper template
const createBrandedEmail = (
  headerColor: string,
  headerIcon: string,
  headerTitle: string,
  bodyContent: string,
  ctaUrl?: string,
  ctaText?: string
) => {
  const logoUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/assets/lawnconnect-logo.png`;
  const currentYear = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LawnConnect Notification</title>
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
                  <div style="background: ${headerColor}; padding: 20px 32px; border-radius: 12px; display: inline-block;">
                    <span style="font-size: 24px; margin-right: 8px;">${headerIcon}</span>
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">${headerTitle}</span>
                  </div>
                </td>
              </tr>
              
              <!-- Body Content -->
              <tr>
                <td style="padding: 0 40px 24px 40px;">
                  ${bodyContent}
                </td>
              </tr>
              
              ${ctaUrl && ctaText ? `
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 0 40px 32px 40px;">
                  <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                    ${ctaText}
                  </a>
                </td>
              </tr>
              ` : ''}
              
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
                    Questions? Contact us at <a href="mailto:support@lawnconnect.jm" style="color: #16a34a;">support@lawnconnect.jm</a>
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
};

const getEmailContent = (type: string, jobTitle: string, jobId: string, additionalData?: NotificationRequest['additionalData']) => {
  const appUrl = "https://lawnconnect.jm";
  const jobUrl = `${appUrl}/job/${jobId}`;
  
  switch (type) {
    case 'proposal_received':
      return {
        subject: `New Proposal for "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #22c55e, #16a34a)',
          '🎉',
          'New Proposal Received!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              Great news! A lawn care provider has submitted a proposal for your job:
            </p>
            <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #16a34a; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">${jobTitle}</p>
            </div>
            ${additionalData?.providerName ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                <strong>Provider:</strong> ${additionalData.providerName}
              </p>
            ` : ''}
            ${additionalData?.amount ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Proposed Price:</strong> <span style="color: #16a34a; font-weight: 600;">J$${additionalData.amount.toLocaleString()}</span>
              </p>
            ` : ''}
            <p style="margin: 0; font-size: 14px; color: #71717a;">
              Log in to view the full proposal and accept or decline.
            </p>
          `,
          jobUrl,
          'View Proposal'
        )
      };

    case 'proposal_accepted':
      return {
        subject: `Congratulations! Your Proposal Was Accepted - "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #22c55e, #16a34a)',
          '✅',
          'Proposal Accepted!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              Congratulations! Your proposal has been accepted for:
            </p>
            <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #16a34a; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">${jobTitle}</p>
            </div>
            ${additionalData?.customerName ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                <strong>Customer:</strong> ${additionalData.customerName}
              </p>
            ` : ''}
            ${additionalData?.amount ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Agreed Price:</strong> <span style="color: #16a34a; font-weight: 600;">J$${additionalData.amount.toLocaleString()}</span>
              </p>
            ` : ''}
            <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px; margin-top: 16px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                💰 The customer has already paid upfront. Complete the job to receive your payout!
              </p>
            </div>
          `,
          jobUrl,
          'View Job Details'
        )
      };

    case 'payment_submitted':
      return {
        subject: `Payment Received for "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #3b82f6, #2563eb)',
          '💰',
          'Payment Received!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              Payment has been submitted for your job:
            </p>
            <div style="background: #eff6ff; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #2563eb; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">${jobTitle}</p>
            </div>
            ${additionalData?.amount ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Amount:</strong> <span style="color: #2563eb; font-weight: 600;">J$${additionalData.amount.toLocaleString()}</span>
              </p>
            ` : ''}
            <p style="margin: 0; font-size: 14px; color: #71717a;">
              Funds are held securely in escrow until job completion is confirmed.
            </p>
          `,
          jobUrl,
          'View Job'
        )
      };

    case 'payment_confirmed':
      return {
        subject: `Payment Confirmed - Work Can Begin on "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #22c55e, #16a34a)',
          '✅',
          'Payment Confirmed!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              Great news! Payment has been confirmed for:
            </p>
            <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #16a34a; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">${jobTitle}</p>
            </div>
            <p style="margin: 0; font-size: 14px; color: #71717a;">
              The provider will now begin work on your lawn. You'll be notified when they mark the job as complete.
            </p>
          `,
          jobUrl,
          'View Job Status'
        )
      };

    case 'job_completed':
      return {
        subject: `Job Complete - Please Review "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          '🏁',
          'Job Marked Complete!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              The provider has marked the following job as complete:
            </p>
            <div style="background: #f5f3ff; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #7c3aed; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #5b21b6;">${jobTitle}</p>
            </div>
            <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                ⏰ Please review the before & after photos and confirm completion within 30 hours. Don't forget to leave a rating!
              </p>
            </div>
          `,
          jobUrl,
          'Review & Confirm'
        )
      };

    case 'review_received':
      return {
        subject: `You Received a New Rating!`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #f59e0b, #d97706)',
          '⭐',
          'New Rating Received!',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              You have received a rating for:
            </p>
            <div style="background: #fffbeb; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #d97706; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">${jobTitle}</p>
            </div>
            ${additionalData?.rating ? `
              <p style="margin: 0 0 16px 0; font-size: 24px; text-align: center;">
                ${'⭐'.repeat(additionalData.rating)}${'☆'.repeat(5 - additionalData.rating)}
              </p>
              <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                ${additionalData.rating} out of 5 stars
              </p>
            ` : ''}
          `,
          jobUrl,
          'View Details'
        )
      };

    case 'late_completion_warning':
      return {
        subject: `⚠️ Late Completion Warning - "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #f59e0b, #d97706)',
          '⚠️',
          'Late Completion Warning',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              You have completed the following job after its preferred date:
            </p>
            <div style="background: #fffbeb; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #d97706; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">${jobTitle}</p>
            </div>
            ${additionalData?.preferredDate ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                <strong>Original Due Date:</strong> ${additionalData.preferredDate}
              </p>
            ` : ''}
            ${additionalData?.lateJobsThisMonth !== undefined ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Late jobs this month:</strong> <span style="color: #dc2626; font-weight: 600;">${additionalData.lateJobsThisMonth}/3</span>
              </p>
            ` : ''}
            <div style="background: #fef2f2; padding: 14px 18px; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                ⚠️ Important Notice
              </p>
              <p style="margin: 0; font-size: 13px; color: #b91c1c;">
                Accumulating 3+ late completions in a month will reduce your payout percentage from 70% to 60%.
              </p>
            </div>
          `
        )
      };

    case 'late_completion_apology':
      return {
        subject: `We Apologize - Your Job "${jobTitle}" Was Completed Late`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #6366f1, #4f46e5)',
          '📝',
          'Our Apologies',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              We sincerely apologize that your job was completed after the preferred date:
            </p>
            <div style="background: #eef2ff; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #4f46e5; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #3730a3;">${jobTitle}</p>
            </div>
            ${additionalData?.preferredDate ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                <strong>Your Preferred Date:</strong> ${additionalData.preferredDate}
              </p>
            ` : ''}
            ${additionalData?.providerName ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Provider:</strong> ${additionalData.providerName}
              </p>
            ` : ''}
            <p style="margin: 0; font-size: 14px; color: #71717a;">
              We understand the inconvenience this may have caused and we're taking steps to ensure our providers meet their commitments on time. Thank you for your patience.
            </p>
          `,
          jobUrl,
          'View Job'
        )
      };

    case 'completion_confirmation_needed':
      return {
        subject: `Action Required - Please Confirm Job Completion: "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #f59e0b, #d97706)',
          '✅',
          'Action Required',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              Your lawn service provider has marked the following job as complete:
            </p>
            <div style="background: #fffbeb; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #d97706; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">${jobTitle}</p>
            </div>
            ${additionalData?.providerName ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Provider:</strong> ${additionalData.providerName}
              </p>
            ` : ''}
            <div style="background: #f0fdf4; padding: 14px 18px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0; font-size: 14px; color: #166534;">
                ✅ <strong>Confirm Completion</strong> - if you're satisfied with the work
              </p>
            </div>
            <div style="background: #fef2f2; padding: 14px 18px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #991b1b;">
                ⚠️ <strong>Report an Issue</strong> - if there are problems that need addressing
              </p>
            </div>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
              ⏰ If you don't respond within 30 hours, the job will be automatically marked as complete.
            </p>
          `,
          jobUrl,
          'Review & Confirm'
        )
      };

    case 'dispute_opened':
      return {
        subject: `⚠️ Dispute Filed for "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #ef4444, #dc2626)',
          '⚠️',
          'Dispute Filed',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              A customer has filed a dispute for the following job:
            </p>
            <div style="background: #fef2f2; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #dc2626; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #991b1b;">${jobTitle}</p>
            </div>
            ${additionalData?.customerName ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">
                <strong>Customer:</strong> ${additionalData.customerName}
              </p>
            ` : ''}
            ${additionalData?.disputeReason ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Reason:</strong> ${additionalData.disputeReason}
              </p>
            ` : ''}
            <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                What you need to do:
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #92400e;">
                <li>Review the customer's photos and explanation</li>
                <li>Respond with your own photos and notes</li>
                <li>Address any issues and re-submit completion</li>
              </ul>
            </div>
          `,
          jobUrl,
          'Respond to Dispute'
        )
      };

    case 'dispute_response':
      return {
        subject: `Provider Responded to Your Dispute - "${jobTitle}"`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #6366f1, #4f46e5)',
          '💬',
          'Dispute Response',
          `
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #3f3f46;">
              The provider has responded to your dispute for:
            </p>
            <div style="background: #eef2ff; padding: 16px 20px; border-radius: 10px; border-left: 4px solid #4f46e5; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #3730a3;">${jobTitle}</p>
            </div>
            ${additionalData?.providerName ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #52525b;">
                <strong>Provider:</strong> ${additionalData.providerName}
              </p>
            ` : ''}
            <p style="margin: 0; font-size: 14px; color: #71717a;">
              Please log in to view their response, photos, and notes. You can then confirm completion or continue the dispute if needed.
            </p>
          `,
          jobUrl,
          'View Response'
        )
      };

    default:
      return {
        subject: `LawnConnect Notification`,
        html: createBrandedEmail(
          'linear-gradient(135deg, #22c55e, #16a34a)',
          '📬',
          'New Notification',
          `<p style="margin: 0; font-size: 16px; color: #3f3f46;">You have a new notification from LawnConnect.</p>`,
          undefined,
          undefined
        )
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

    const { subject, html } = getEmailContent(type, jobTitle, jobId, additionalData);

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
