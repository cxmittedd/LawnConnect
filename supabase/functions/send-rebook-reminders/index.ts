import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const buildHtml = (firstName: string, daysSince: number) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #16a34a; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">LawnConnect</h1>
  </div>
  <div style="padding: 30px; background-color: #f9fafb;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${escapeHtml(firstName)},</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      It's been about <strong>${daysSince} days</strong> since your last lawn service with LawnConnect —
      your grass is probably starting to get overgrown by now.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">
      Stay ahead of the overgrowth and keep your lawn looking sharp. Booking again only takes a minute,
      and a trusted provider in your community will be ready to help.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://connectlawn.com/post-job"
         style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none;
                border-radius: 6px; font-weight: bold; display: inline-block;">
        Book Your Next Cut
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
      Regular cuts protect your lawn from pests, weeds, and that "jungle" look the rainy season brings.
    </p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 0;">
      Best regards,<br/><strong>The LawnConnect Team</strong>
    </p>
  </div>
  <div style="background-color: #e5e7eb; padding: 15px; text-align: center;">
    <p style="color: #6b7280; margin: 0; font-size: 12px;">
      Jamaica's trusted lawn care marketplace · connectlawn.com
    </p>
  </div>
</div>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffIso = cutoff.toISOString();

    // Pull all completed jobs with their completion dates
    const { data: jobs, error: jobsErr } = await supabase
      .from("job_requests")
      .select("id, customer_id, completed_at, status")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    if (jobsErr) throw jobsErr;

    // Latest completed job per customer
    const latestByCustomer = new Map<string, { id: string; completed_at: string }>();
    for (const j of jobs || []) {
      if (!latestByCustomer.has(j.customer_id)) {
        latestByCustomer.set(j.customer_id, { id: j.id, completed_at: j.completed_at });
      }
    }

    // Customers with an active (non-completed, non-cancelled) job — skip them
    const { data: activeJobs } = await supabase
      .from("job_requests")
      .select("customer_id")
      .not("status", "in", "(completed,cancelled,refunded)");
    const activeSet = new Set((activeJobs || []).map((r: any) => r.customer_id));

    // Eligible: last completion >= 30 days ago, no active job
    const eligible: { customer_id: string; job_id: string; days: number }[] = [];
    for (const [customer_id, info] of latestByCustomer) {
      if (activeSet.has(customer_id)) continue;
      if (info.completed_at > cutoffIso) continue;
      const days = Math.floor(
        (Date.now() - new Date(info.completed_at).getTime()) / 86400000
      );
      eligible.push({ customer_id, job_id: info.id, days });
    }

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ sent: 0, eligible: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Existing reminder records — skip anyone reminded in last 30 days
    const { data: reminders } = await supabase
      .from("customer_rebook_reminders")
      .select("customer_id, last_reminder_sent_at")
      .in("customer_id", eligible.map((e) => e.customer_id));
    const reminderMap = new Map(
      (reminders || []).map((r: any) => [r.customer_id, r.last_reminder_sent_at])
    );

    const toSend = eligible.filter((e) => {
      const last = reminderMap.get(e.customer_id);
      return !last || last < cutoffIso;
    });

    if (toSend.length === 0) {
      return new Response(JSON.stringify({ sent: 0, eligible: eligible.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profiles (for first name)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", toSend.map((e) => e.customer_id));
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.first_name]));

    // Emails (auth)
    let sent = 0;
    let failed = 0;

    for (const e of toSend) {
      try {
        const { data: userRes, error: userErr } =
          await supabase.auth.admin.getUserById(e.customer_id);
        if (userErr || !userRes?.user?.email) {
          failed++;
          continue;
        }
        const email = userRes.user.email;
        const firstName = profileMap.get(e.customer_id) || "there";

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "LawnConnect <noreply@connectlawn.com>",
            to: [email],
            subject: "Your lawn may be getting overgrown — time for a fresh cut?",
            html: buildHtml(firstName, e.days),
          }),
        });

        if (!resp.ok) {
          console.error("Resend failed", await resp.text());
          failed++;
          continue;
        }

        await supabase.from("customer_rebook_reminders").upsert(
          {
            customer_id: e.customer_id,
            last_reminder_sent_at: new Date().toISOString(),
            last_completed_job_id: e.job_id,
          },
          { onConflict: "customer_id" }
        );
        sent++;
      } catch (err) {
        console.error("Error sending to", e.customer_id, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, eligible: eligible.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-rebook-reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
