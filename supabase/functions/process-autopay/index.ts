import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_URL = "https://connectlawn.com";
const LOGO_URL = "https://oykpslopjzjhfwepxowp.supabase.co/storage/v1/object/public/assets/lawnconnect-logo.png";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function nextRunDate(dayOfMonth: number, from: Date): string {
  const base = addMonths(from, 1);
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Math.min(dayOfMonth, 28)));
  return d.toISOString().slice(0, 10);
}

async function sendPaymentEmail(
  resend: Resend,
  email: string,
  name: string,
  jobId: string,
  title: string,
  amount: number,
) {
  const html = `
  <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px;text-align:center">
      <img src="${LOGO_URL}" alt="LawnConnect" style="height:52px;margin-bottom:12px">
      <h1 style="color:#fff;margin:0;font-size:22px">Your monthly lawn service is scheduled</h1>
    </div>
    <div style="padding:28px;color:#333">
      <p>Hi ${name},</p>
      <p>Your autopay booking for <strong>${title}</strong> has been created for this month.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px;text-align:center;margin:18px 0">
        <p style="margin:0;color:#166534;font-size:14px">Amount due</p>
        <p style="margin:4px 0 0;color:#15803d;font-size:28px;font-weight:700">J$${Number(amount).toLocaleString("en-JM")}</p>
      </div>
      <div style="text-align:center;margin-top:24px">
        <a href="${SITE_URL}/job/${jobId}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600">Confirm &amp; Pay</a>
      </div>
      <p style="color:#666;font-size:13px;margin-top:22px">You can pause or cancel autopay any time from your LawnConnect account.</p>
    </div>
  </div>`;

  await resend.emails.send({
    from: "LawnConnect <noreply@connectlawn.com>",
    to: [email],
    subject: `Your monthly lawn booking - J$${Number(amount).toLocaleString("en-JM")}`,
    html,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduler-only endpoint
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expectedCronSecret = Deno.env.get("CRON_AUTH_TOKEN") ?? "";
  const authorized =
    (serviceKey && token === serviceKey) ||
    (expectedCronSecret && cronSecret === expectedCronSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendKey ? new Resend(resendKey) : null;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  try {
    // Only process schedules WITHOUT an EzeePay subscription — those are
    // handled entirely by EzeePay's recurring charge webhook.
    const { data: schedules, error } = await supabase
      .from("autopay_schedules")
      .select("*")
      .eq("active", true)
      .lte("next_run_date", todayStr)
      .is("ezeepay_subscription_id", null);

    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const s of schedules ?? []) {
      try {
        // Quote-based schedules repeat the agreed price; all others use the
        // standard server price table.
        const price = Number(s.custom_price) > 0
          ? Number(s.custom_price)
          : serviceBasePrice(s.lawn_size, s.title);
        const { data: job, error: jobError } = await supabase
          .from("job_requests")
          .insert({
            customer_id: s.customer_id,
            title: s.title,
            description: s.description,
            location: s.location,
            parish: s.parish,
            community: s.community,
            lawn_size: s.lawn_size,
            preferred_date: todayStr,
            preferred_time: s.preferred_time,
            base_price: price,
            final_price: price,
            platform_fee: Math.round(price * 0.3 * 100) / 100,
            provider_payout: Math.round(price * 0.7 * 100) / 100,
            payment_status: "pending",
            status: "open",
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Saved-card charging is enabled once the payment provider's recurring
        // (card-on-file) credentials are configured. Until then the customer
        // receives a secure payment link for the auto-created booking.
        const hasToken = Boolean(s.payment_method_id);
        let charged = false;

        if (hasToken) {
          const { data: pm } = await supabase
            .from("autopay_payment_methods")
            .select("provider_token")
            .eq("id", s.payment_method_id)
            .maybeSingle();
          if (pm?.provider_token && Deno.env.get("EZEEPAY_RECURRING_ENABLED") === "true") {
            // Placeholder for provider recurring charge call.
            charged = false;
          }
        }

        if (!charged && resend) {
          const { data: userRes } = await supabase.auth.admin.getUserById(s.customer_id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", s.customer_id)
            .maybeSingle();
          if (userRes?.user?.email) {
            await sendPaymentEmail(
              resend,
              userRes.user.email,
              profile?.first_name || "there",
              job.id,
              job.title,
              job.final_price ?? job.base_price,
            );
          }
        }

        await supabase
          .from("autopay_schedules")
          .update({
            last_run_date: todayStr,
            last_job_id: job.id,
            next_run_date: nextRunDate(s.day_of_month, today),
            failure_count: 0,
            last_error: null,
          })
          .eq("id", s.id);

        results.push({ scheduleId: s.id, jobId: job.id, charged });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const failures = (s.failure_count ?? 0) + 1;
        await supabase
          .from("autopay_schedules")
          .update({
            failure_count: failures,
            last_error: message,
            active: failures < 3,
            next_run_date: nextRunDate(s.day_of_month, today),
          })
          .eq("id", s.id);
        results.push({ scheduleId: s.id, error: message, failures });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-autopay failed:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
