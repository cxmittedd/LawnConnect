import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { verifyCallbackToken } from "../_shared/ezeepay-callback-token.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Track processed webhooks to prevent replay attacks (in-memory for edge function)
const processedWebhooks = new Set<string>();

const formatCurrency = (amount: number): string => {
  return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generateInvoiceNumber = (jobId: string, paymentDate: string): string => {
  const date = new Date(paymentDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = jobId.substring(0, 8).toUpperCase();
  return `INV-${year}${month}-${shortId}`;
};

interface JobDetails {
  id: string;
  title: string;
  location: string;
  parish: string;
  lawn_size: string | null;
  base_price: number;
  final_price: number | null;
  platform_fee: number | null;
  customer_id: string;
}

interface CustomerProfile {
  full_name: string | null;
  first_name: string | null;
}

const LAWNCONNECT_LOGO_URL = "https://connectlawn.com/pwa-512x512.png";

const createPaymentConfirmationEmail = (
  job: JobDetails,
  customerName: string,
  customerEmail: string,
  transactionNumber: string,
  invoiceNumber: string,
  paymentDate: string
): string => {
  const appUrl = "https://connectlawn.com";
  const amount = job.final_price || job.base_price;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation - ${invoiceNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px; text-align: center;">
                  <img src="${LAWNCONNECT_LOGO_URL}" alt="LawnConnect" width="80" height="80" style="display: block; margin: 0 auto 16px auto; border: 0; border-radius: 8px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Payment Confirmed!</h1>
                  <p style="color: #bbf7d0; margin: 8px 0 0 0; font-size: 14px;">Your job is now live</p>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 32px;">
                  <p style="color: #18181b; margin: 0 0 24px 0; font-size: 16px;">
                    Hi ${customerName},
                  </p>
                  <p style="color: #52525b; margin: 0 0 24px 0; font-size: 14px; line-height: 1.6;">
                    Great news! Your payment has been successfully processed. Your lawn care job is now visible to verified providers in your area, and you'll be notified as soon as one accepts it.
                  </p>
                  
                  <!-- Payment Summary Card -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; border-radius: 12px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 24px;">
                        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Payment Summary</h2>
                        
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Invoice Number</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right; font-family: monospace;">${invoiceNumber}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Transaction Reference</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right; font-family: monospace;">${transactionNumber}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Payment Date</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right;">${formatDate(paymentDate)}</td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding: 8px 0;"><hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0;"></td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #18181b; font-size: 16px; font-weight: 600;">Amount Paid</td>
                            <td style="padding: 8px 0; color: #16a34a; font-size: 20px; font-weight: 700; text-align: right;">${formatCurrency(amount)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Job Details Card -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 12px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 24px;">
                        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Job Details</h2>
                        
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Service</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right; font-weight: 500;">${job.title}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Location</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right;">${job.location}, ${job.parish}</td>
                          </tr>
                          ${job.lawn_size ? `
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Lawn Size</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right;">${job.lawn_size}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Status Badge -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 24px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ✓ Payment Secured
                    </span>
                  </div>
                  
                  <!-- What's Next Section -->
                  <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <h3 style="color: #1e40af; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">What happens next?</h3>
                    <ol style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                      <li>A verified provider will accept your job</li>
                      <li>You'll receive a notification when your job is confirmed</li>
                      <li>The provider will complete the work on the scheduled date</li>
                      <li>Once you approve the completed work, payment is released</li>
                    </ol>
                  </div>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center;">
                    <a href="${appUrl}/job/${job.id}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                      View Your Job
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f4f4f5; padding: 24px 32px; text-align: center;">
                  <p style="color: #71717a; margin: 0 0 8px 0; font-size: 14px;">
                    Thank you for choosing LawnConnect!
                  </p>
                  <p style="color: #a1a1aa; margin: 0 0 16px 0; font-size: 12px;">
                    Your payment is held securely until the job is completed to your satisfaction.
                  </p>
                  <a href="${appUrl}/invoices" style="color: #16a34a; font-size: 13px; text-decoration: none;">
                    View All Invoices →
                  </a>
                  <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 11px;">
                    LawnConnect • Jamaica's Lawn Care Marketplace<br>
                    <a href="mailto:officiallawnconnect@gmail.com" style="color: #16a34a; text-decoration: none;">officiallawnconnect@gmail.com</a>
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

serve(async (req) => {
  const webhookId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`[${webhookId}] ========== EZEEPAY WEBHOOK START ==========`);
  console.log(`[${webhookId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`[${webhookId}] Method: ${req.method}`);
  console.log(`[${webhookId}] Headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from EzeePay
    const rawBody = await req.text();
    console.log(`[${webhookId}] Raw body length: ${rawBody.length} chars`);
    console.log(`[${webhookId}] Raw body preview: ${rawBody.substring(0, 500)}...`);
    
    let payload: Record<string, string> = {};
    let parseMethod = 'unknown';
    
    // Check if the body looks like JSON (starts with { or [)
    const trimmedBody = rawBody.trim();
    if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
      // Parse as JSON
      try {
        payload = JSON.parse(trimmedBody);
        parseMethod = 'json';
        console.log(`[${webhookId}] Parsed as JSON successfully`);
      } catch (e) {
        console.error(`[${webhookId}] Failed to parse JSON:`, e);
      }
    } else {
      // Try form data (URL encoded)
      try {
        const formData = new URLSearchParams(rawBody);
        formData.forEach((value, key) => {
          // Check if the key itself looks like JSON (EzeePay sometimes sends JSON as form key)
          if (key.startsWith('{') && value === '') {
            try {
              const jsonFromKey = JSON.parse(key);
              Object.assign(payload, jsonFromKey);
              parseMethod = 'json-in-form-key';
              console.log(`[${webhookId}] Parsed JSON from form key`);
            } catch {
              payload[key] = value;
            }
          } else {
            payload[key] = value;
          }
        });
        if (parseMethod === 'unknown') parseMethod = 'form-urlencoded';
        console.log(`[${webhookId}] Parsed as form data successfully`);
      } catch (e) {
        console.error(`[${webhookId}] Failed to parse form data:`, e);
      }
    }

    console.log(`[${webhookId}] Parse method: ${parseMethod}`);
    console.log(`[${webhookId}] Payload keys: ${Object.keys(payload).join(', ')}`);
    console.log(`[${webhookId}] Full payload:`, JSON.stringify(payload, null, 2));

    // EzeePay sends CustomOrderId, not order_id
    const {
      ResponseCode,
      ResponseDescription,
      TransactionNumber,
      CustomOrderId,
      order_id,
    } = payload;

    // Use CustomOrderId if order_id is not present (EzeePay uses CustomOrderId)
    const orderId = CustomOrderId || order_id;

    console.log(`[${webhookId}] Transaction details:`);
    console.log(`[${webhookId}]   - ResponseCode: ${ResponseCode}`);
    console.log(`[${webhookId}]   - ResponseDescription: ${ResponseDescription}`);
    console.log(`[${webhookId}]   - TransactionNumber: ${TransactionNumber}`);
    console.log(`[${webhookId}]   - Order ID (resolved): ${orderId}`);

    // Callback authenticity: EzeePay is the only party that receives the signed
    // post_back_url we register per order, so a valid token proves the payment
    // notification originated from EzeePay and was not forged by a caller.
    const callbackToken = new URL(req.url).searchParams.get('wt');
    const assertTrustedCallback = async (reference: string): Promise<Response | null> => {
      const ok = await verifyCallbackToken(reference, callbackToken);
      if (ok) return null;
      console.error(`[${webhookId}] REJECTED: missing or invalid callback token for ${reference}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unverified payment notification' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    };


    // --- Handle EzeePay subscription cancellation notification ---
    if (payload.cancellation_date) {
      console.log(`[${webhookId}] Cancellation notification received`);
      const txnNum = payload.transaction_number || '';
      const cancelOrderId = payload.order_id || '';

      // Extract schedule_id from order_id (format: autopay-{schedule_id})
      if (cancelOrderId.startsWith('autopay-')) {
        const scheduleId = cancelOrderId.substring(8);
        const { error: cancelUpdateError } = await supabase
          .from('autopay_schedules')
          .update({ active: false, ezeepay_status: 'cancelled' })
          .eq('id', scheduleId);

        if (cancelUpdateError) {
          console.error(`[${webhookId}] Error updating cancelled schedule:`, cancelUpdateError);
        } else {
          console.log(`[${webhookId}] Schedule ${scheduleId} marked cancelled by EzeePay`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Cancellation notification processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Handle autopay subscription postbacks (order_id starts with autopay-) ---
    if (orderId && orderId.startsWith('autopay-')) {
      const scheduleId = orderId.substring(8);
      console.log(`[${webhookId}] Autopay postback for schedule: ${scheduleId}`);

      const autopayAuthFailure = await assertTrustedCallback(orderId);
      if (autopayAuthFailure) return autopayAuthFailure;

      // Look up the schedule
      const { data: schedule, error: schedError } = await supabase
        .from('autopay_schedules')
        .select('id, customer_id, title, description, parish, community, location, lawn_size, preferred_time, ezeepay_status, ezeepay_subscription_id, frequency, day_of_month, next_run_date, failure_count')
        .eq('id', scheduleId)
        .single();

      if (schedError || !schedule) {
        console.error(`[${webhookId}] Autopay schedule not found: ${scheduleId}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Autopay schedule not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isSuccess = String(ResponseCode) === '1';
      const autopayIdempotencyKey = `autopay-${scheduleId}-${TransactionNumber || 'no-txn'}`;

      if (processedWebhooks.has(autopayIdempotencyKey)) {
        console.log(`[${webhookId}] DUPLICATE: Autopay webhook already processed`);
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      processedWebhooks.add(autopayIdempotencyKey);

      if (!isSuccess) {
        console.log(`[${webhookId}] Autopay charge FAILED: ${ResponseDescription}`);
        // Increment failure count
        await supabase
          .from('autopay_schedules')
          .update({ failure_count: ((schedule as any).failure_count ?? 0) + 1, last_error: String(ResponseDescription || 'Charge failed') })
          .eq('id', scheduleId);
        return new Response(
          JSON.stringify({ success: true, payment_success: false, message: String(ResponseDescription) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!TransactionNumber) {
        console.error(`[${webhookId}] Missing TransactionNumber for autopay charge`);
        return new Response(
          JSON.stringify({ success: false, error: 'Missing transaction reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (schedule.ezeepay_status === 'pending') {
        // Initial card setup charge — mark subscription as active
        console.log(`[${webhookId}] Initial autopay setup confirmed for schedule ${scheduleId}`);
        await supabase
          .from('autopay_schedules')
          .update({
            ezeepay_status: 'active',
            ezeepay_transaction_number: TransactionNumber,
          })
          .eq('id', scheduleId);

        // Send activation confirmation email
        try {
          const { data: userRes } = await supabase.auth.admin.getUserById(schedule.customer_id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', schedule.customer_id)
            .maybeSingle();

          if (userRes?.user?.email) {
            const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
            await resend.emails.send({
              from: "LawnConnect <noreply@connectlawn.com>",
              to: [userRes.user.email],
              subject: "Autopay is set up - your monthly lawn booking is confirmed",
              html: `<div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px;text-align:center">
                  <img src="${LAWNCONNECT_LOGO_URL}" alt="LawnConnect" width="72" height="72" style="display:block;margin:0 auto 14px;border:0;border-radius:8px">
                  <h1 style="color:#fff;margin:0;font-size:22px">Autopay Is Set Up</h1>
                </div>
                <div style="padding:28px;color:#333">
                  <p>Hi ${profile?.first_name || 'there'},</p>
                  <p>Your autopay for <strong>${schedule.title}</strong> is now active. Your card will be charged automatically and a new lawn care booking will be created for you each time — no need to book manually.</p>
                  <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">
                    <tr><td style="padding:8px 0;color:#666">Service</td><td style="padding:8px 0;text-align:right"><strong>${schedule.title}</strong></td></tr>
                    <tr><td style="padding:8px 0;color:#666">Address</td><td style="padding:8px 0;text-align:right">${schedule.location}${schedule.community ? `, ${schedule.community}` : ''}, ${schedule.parish}</td></tr>
                    ${schedule.lawn_size ? `<tr><td style="padding:8px 0;color:#666">Lawn size</td><td style="padding:8px 0;text-align:right">${schedule.lawn_size}</td></tr>` : ''}
                    <tr><td style="padding:8px 0;color:#666">How often</td><td style="padding:8px 0;text-align:right">${schedule.frequency === 'monthly' ? 'Every month' : String(schedule.frequency)}</td></tr>
                    ${schedule.next_run_date ? `<tr><td style="padding:8px 0;color:#666">Next booking</td><td style="padding:8px 0;text-align:right">${new Date(schedule.next_run_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>` : ''}
                    ${schedule.preferred_time ? `<tr><td style="padding:8px 0;color:#666">Preferred time</td><td style="padding:8px 0;text-align:right">${schedule.preferred_time}</td></tr>` : ''}
                  </table>
                  <div style="text-align:center;margin:24px 0">
                    <a href="https://connectlawn.com/autopay" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 26px;border-radius:6px;display:inline-block;font-weight:600">Manage Autopay</a>
                  </div>
                  <p style="color:#666;font-size:13px;margin-top:22px">You can pause or cancel any time from your LawnConnect account. Your card details are stored securely with our payment provider, never on LawnConnect.</p>
                </div>
              </div>`,
            });
          }
        } catch (e) {
          console.error(`[${webhookId}] Autopay activation email failed:`, e);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Autopay subscription activated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Recurring monthly charge — create a paid job automatically
        console.log(`[${webhookId}] Recurring autopay charge for schedule ${scheduleId}`);

        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: job, error: jobError } = await supabase
          .from('job_requests')
          .insert({
            customer_id: schedule.customer_id,
            title: schedule.title,
            description: schedule.description,
            location: schedule.location,
            parish: schedule.parish,
            community: schedule.community,
            lawn_size: schedule.lawn_size,
            preferred_date: todayStr,
            preferred_time: schedule.preferred_time,
            base_price: 0,
            payment_status: 'pending',
            status: 'open',
          })
          .select()
          .single();

        if (jobError) {
          console.error(`[${webhookId}] Error creating autopay job:`, jobError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to create job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark job as paid (EzeePay already charged the card)
        const recurringPaymentDate = new Date().toISOString();
        await supabase
          .from('job_requests')
          .update({
            payment_status: 'paid',
            payment_reference: TransactionNumber,
            payment_confirmed_at: recurringPaymentDate,
            status: 'open',
          })
          .eq('id', job.id);

        // Update schedule tracking
        await supabase
          .from('autopay_schedules')
          .update({
            last_run_date: todayStr,
            last_job_id: job.id,
            failure_count: 0,
            last_error: null,
          })
          .eq('id', scheduleId);

        // Send confirmation email to customer
        try {
          const { data: userRes } = await supabase.auth.admin.getUserById(schedule.customer_id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', schedule.customer_id)
            .maybeSingle();

          if (userRes?.user?.email) {
            const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
            const amount = job.final_price ?? job.base_price;
            await resend.emails.send({
              from: "LawnConnect <noreply@connectlawn.com>",
              to: [userRes.user.email],
              subject: `Monthly lawn booking created - J$${Number(amount).toLocaleString("en-JM")}`,
              html: `<div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px;text-align:center">
                  <img src="${LAWNCONNECT_LOGO_URL}" alt="LawnConnect" width="72" height="72" style="display:block;margin:0 auto 14px;border:0;border-radius:8px">
                  <h1 style="color:#fff;margin:0;font-size:22px">Your monthly booking is ready</h1>
                </div>
                <div style="padding:28px;color:#333">
                  <p>Hi ${profile?.first_name || 'there'},</p>
                  <p>Your monthly autopay just created a new <strong>${schedule.title}</strong> booking. The payment has been processed automatically.</p>
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px;text-align:center;margin:18px 0">
                    <p style="margin:0;color:#166534;font-size:14px">Amount charged</p>
                    <p style="margin:4px 0 0;color:#15803d;font-size:28px;font-weight:700">J$${Number(amount).toLocaleString("en-JM")}</p>
                  </div>
                  <div style="text-align:center;margin-top:24px">
                    <a href="https://connectlawn.com/job/${job.id}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600">View Your Job</a>
                  </div>
                </div>
              </div>`,
            });
          }
        } catch (e) {
          console.error(`[${webhookId}] Autopay job email failed:`, e);
        }

        // Notify admin
        try {
          const resendAdmin = new Resend(Deno.env.get("RESEND_API_KEY"));
          await resendAdmin.emails.send({
            from: "LawnConnect <noreply@connectlawn.com>",
            to: ["officiallawnconnect@gmail.com"],
            subject: `Autopay Booking: ${schedule.title} - ${schedule.parish}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background-color:#16a34a;padding:24px;text-align:center">
                <img src="${LAWNCONNECT_LOGO_URL}" alt="LawnConnect" width="72" height="72" style="display:block;margin:0 auto 12px;border:0;border-radius:8px">
                <h2 style="color:#fff;margin:0">New autopay booking</h2>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:0">
                <p>New autopay booking created and paid automatically.</p>
                <p>Job: ${job.id}<br>Transaction: ${TransactionNumber}</p>
              </div>
            </div>`,
          });
        } catch (e) {
          console.error(`[${webhookId}] Admin alert failed:`, e);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Autopay job created and paid', job_id: job.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate required fields
    if (!orderId) {
      console.error(`[${webhookId}] ERROR: Missing order_id/CustomOrderId`);
      console.error(`[${webhookId}] Available keys: ${Object.keys(payload).join(', ')}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Missing order_id', received_keys: Object.keys(payload) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order_id format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.error(`[${webhookId}] ERROR: Invalid order_id format: ${orderId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid order_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create idempotency key to prevent replay attacks
    const idempotencyKey = `${orderId}-${TransactionNumber || 'no-txn'}`;
    console.log(`[${webhookId}] Idempotency key: ${idempotencyKey}`);
    
    // Check if we've already processed this webhook
    if (processedWebhooks.has(idempotencyKey)) {
      console.log(`[${webhookId}] DUPLICATE: Webhook already processed, ignoring`);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch full job details for email
    console.log(`[${webhookId}] Fetching job details from database...`);
    const { data: existingJob, error: fetchError } = await supabase
      .from('job_requests')
      .select('id, title, location, parish, lawn_size, base_price, final_price, platform_fee, payment_status, customer_id, preferred_date, preferred_time')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingJob) {
      console.error(`[${webhookId}] ERROR: Job not found for order_id: ${orderId}`);
      console.error(`[${webhookId}] Fetch error:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${webhookId}] Job found:`);
    console.log(`[${webhookId}]   - Title: ${existingJob.title}`);
    console.log(`[${webhookId}]   - Customer: ${existingJob.customer_id}`);
    console.log(`[${webhookId}]   - Amount: J$${existingJob.final_price || existingJob.base_price}`);
    console.log(`[${webhookId}]   - Current payment_status: ${existingJob.payment_status}`);

    // Only process if payment is still pending
    if (existingJob.payment_status !== 'pending') {
      console.log(`[${webhookId}] SKIP: Payment status is not pending (${existingJob.payment_status})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          current_status: existingJob.payment_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was successful (ResponseCode === '1')
    const isSuccess = String(ResponseCode) === '1';
    const paymentDate = new Date().toISOString();
    console.log(`[${webhookId}] Payment result: ${isSuccess ? 'SUCCESS' : 'FAILED'} (ResponseCode=${ResponseCode})`);

    if (isSuccess) {
      // Validate TransactionNumber exists for successful payments
      if (!TransactionNumber) {
        console.error(`[${webhookId}] ERROR: Missing TransactionNumber for successful payment`);
        return new Response(
          JSON.stringify({ success: false, error: 'Missing transaction reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Amount verification: ensure paid amount >= expected job amount
      const expectedAmount = existingJob.final_price || existingJob.base_price;
      const paidAmount = payload.Amount ? parseFloat(payload.Amount) : null;
      console.log(`[${webhookId}] Amount check: paid=${paidAmount}, expected=${expectedAmount}`);
      
      if (paidAmount !== null && paidAmount < expectedAmount) {
        console.error(`[${webhookId}] ERROR: Amount mismatch! Paid J$${paidAmount} but expected >= J$${expectedAmount}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Payment amount is less than expected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${webhookId}] Processing successful payment...`);
      console.log(`[${webhookId}]   - Transaction Number: ${TransactionNumber}`);

      // Mark as processed BEFORE updating to prevent race conditions
      processedWebhooks.add(idempotencyKey);
      console.log(`[${webhookId}] Added to processed webhooks set (size: ${processedWebhooks.size})`);

      // Update the job with payment confirmation
      console.log(`[${webhookId}] Updating job payment status to 'paid'...`);
      const { data: job, error: updateError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_reference: TransactionNumber,
          payment_confirmed_at: paymentDate,
          status: 'open',
        })
        .eq('id', orderId)
        .eq('payment_status', 'pending') // Double-check to prevent race conditions
        .select()
        .single();

      if (updateError) {
        console.error(`[${webhookId}] ERROR: Failed to update job payment status:`, updateError);
        // Remove from processed set if update failed
        processedWebhooks.delete(idempotencyKey);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update payment status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${webhookId}] SUCCESS: Job payment confirmed`);
      console.log(`[${webhookId}]   - Job ID: ${job?.id}`);
      console.log(`[${webhookId}]   - Transaction Reference: ${TransactionNumber}`);
      console.log(`[${webhookId}]   - Payment Date: ${paymentDate}`);

      // Send payment confirmation email
      try {
        // Get customer details from auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(existingJob.customer_id);
        
        if (authError) {
          console.error(`[${webhookId}] WARNING: Error fetching auth user:`, authError);
        }

        const customerEmail = authUser?.user?.email;
        console.log(`[${webhookId}] Customer email: ${customerEmail || 'NOT FOUND'}`);
        
        // Get customer profile for name
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('full_name, first_name')
          .eq('id', existingJob.customer_id)
          .single();

        const customerName = customerProfile?.first_name || customerProfile?.full_name || 'Valued Customer';
        console.log(`[${webhookId}] Customer name: ${customerName}`);

        if (customerEmail) {
          const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
          const invoiceNumber = generateInvoiceNumber(existingJob.id, paymentDate);
          const amount = existingJob.final_price || existingJob.base_price;

          // Create and send payment confirmation email
          const emailHtml = createPaymentConfirmationEmail(
            existingJob as JobDetails,
            customerName,
            customerEmail,
            TransactionNumber,
            invoiceNumber,
            paymentDate
          );

          console.log(`[${webhookId}] Sending confirmation email to: ${customerEmail}`);
          const emailResponse = await resend.emails.send({
            from: "LawnConnect <billing@connectlawn.com>",
            to: [customerEmail],
            subject: `Payment Confirmed - ${invoiceNumber}`,
            html: emailHtml,
          });

          console.log(`[${webhookId}] Email sent successfully:`, JSON.stringify(emailResponse));

          // Store invoice in database
          console.log(`[${webhookId}] Storing invoice: ${invoiceNumber}`);
          const { error: invoiceError } = await supabase.from('invoices').insert({
            invoice_number: invoiceNumber,
            customer_id: existingJob.customer_id,
            job_id: existingJob.id,
            job_title: existingJob.title,
            job_location: existingJob.location,
            parish: existingJob.parish,
            lawn_size: existingJob.lawn_size,
            amount: amount,
            platform_fee: existingJob.platform_fee || 0,
            payment_reference: TransactionNumber,
            payment_date: paymentDate,
          });

          if (invoiceError) {
            console.error(`[${webhookId}] ERROR: Failed to store invoice:`, invoiceError);
          } else {
            console.log(`[${webhookId}] Invoice stored successfully: ${invoiceNumber}`);
          }
        } else {
          console.warn(`[${webhookId}] WARNING: No email found for customer: ${existingJob.customer_id}`);
        }
      } catch (emailError) {
        // Don't fail the webhook if email fails
        console.error(`[${webhookId}] ERROR: Email sending failed:`, emailError);
      }

      // Notify admin of the new paid booking (server-side, so it always fires
      // even if the customer never returns to the app after paying)
      try {
        const { data: adminCustomerProfile } = await supabase
          .from('profiles')
          .select('full_name, first_name, last_name, phone_number')
          .eq('id', existingJob.customer_id)
          .single();

        const adminCustomerName =
          adminCustomerProfile?.full_name ||
          `${adminCustomerProfile?.first_name || ''} ${adminCustomerProfile?.last_name || ''}`.trim() ||
          'Customer';
        const bookingAmount = existingJob.final_price || existingJob.base_price;

        const resendAdmin = new Resend(Deno.env.get("RESEND_API_KEY"));
        const adminEmailResponse = await resendAdmin.emails.send({
          from: "LawnConnect <noreply@connectlawn.com>",
          to: ["officiallawnconnect@gmail.com"],
          subject: `New Booking: ${existingJob.title} - ${existingJob.parish}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #16a34a; padding: 24px; text-align: center;">
                <img src="${LAWNCONNECT_LOGO_URL}" alt="LawnConnect" width="72" height="72" style="display: block; margin: 0 auto 12px; border: 0; border-radius: 8px;">
                <h2 style="color: #ffffff; margin: 0;">New paid booking</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0;"><strong>Job</strong></td><td style="padding: 6px 0;">${existingJob.title}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Job ID</strong></td><td style="padding: 6px 0;">${existingJob.id}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Customer</strong></td><td style="padding: 6px 0;">${adminCustomerName}${adminCustomerProfile?.phone_number ? ` (${adminCustomerProfile.phone_number})` : ''}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Location</strong></td><td style="padding: 6px 0;">${existingJob.location || ''}, ${existingJob.parish || ''}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Lawn size</strong></td><td style="padding: 6px 0;">${existingJob.lawn_size || 'N/A'}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Preferred date</strong></td><td style="padding: 6px 0;">${existingJob.preferred_date || 'Not specified'}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Amount paid</strong></td><td style="padding: 6px 0;">J$${Number(bookingAmount || 0).toLocaleString()}</td></tr>
                  <tr><td style="padding: 6px 0;"><strong>Transaction</strong></td><td style="padding: 6px 0;">${TransactionNumber}</td></tr>
                </table>
              </div>
            </div>
          `,
        });
        console.log(`[${webhookId}] Admin booking alert sent:`, JSON.stringify(adminEmailResponse));
      } catch (adminAlertError) {
        console.error(`[${webhookId}] ERROR: Admin booking alert failed:`, adminAlertError);
      }



      // Clean up old processed webhooks to prevent memory issues (keep last 1000)
      if (processedWebhooks.size > 1000) {
        const entries = Array.from(processedWebhooks);
        entries.slice(0, entries.length - 1000).forEach(key => processedWebhooks.delete(key));
        console.log(`[${webhookId}] Cleaned up processed webhooks, size now: ${processedWebhooks.size}`);
      }

    } else {
      console.log(`[${webhookId}] PAYMENT FAILED: ${ResponseDescription}`);
      
      // Update job status to failed
      const { error: failError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'failed',
        })
        .eq('id', orderId)
        .eq('payment_status', 'pending');

      if (failError) {
        console.error(`[${webhookId}] ERROR: Failed to update payment status to failed:`, failError);
      } else {
        console.log(`[${webhookId}] Job payment status updated to 'failed'`);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[${webhookId}] Total processing time: ${totalDuration}ms`);
    console.log(`[${webhookId}] ========== EZEEPAY WEBHOOK END (SUCCESS) ==========`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: true,
        payment_success: isSuccess,
        webhook_id: webhookId,
        processing_time_ms: totalDuration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${webhookId}] FATAL ERROR:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`[${webhookId}] Stack:`, error instanceof Error ? error.stack : 'N/A');
    console.log(`[${webhookId}] Total processing time: ${totalDuration}ms`);
    console.log(`[${webhookId}] ========== EZEEPAY WEBHOOK END (ERROR) ==========`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Webhook processing failed',
        webhook_id: webhookId,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
