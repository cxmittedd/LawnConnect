import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Provider payout percentages
const NORMAL_PAYOUT_PERCENTAGE = 1.00;
const DISPUTED_PAYOUT_PERCENTAGE = 1.00;

interface ProviderPayout {
  providerId: string;
  providerEmail: string;
  providerName: string;
  amount: number;
  jobsCount: number;
  jobIds: string[];
}

async function getProviderEmail(supabase: any, providerId: string): Promise<{ email: string; name: string } | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(providerId);
    if (error || !data?.user) {
      console.log(`Could not get email for provider ${providerId}:`, error?.message);
      return null;
    }
    
    // Get provider name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', providerId)
      .maybeSingle();
    
    const name = profile?.first_name || 'Provider';
    
    return { email: data.user.email, name };
  } catch (err) {
    console.error(`Error getting provider email:`, err);
    return null;
  }
}

async function sendPayoutNotification(
  resend: Resend, 
  providerEmail: string, 
  providerName: string, 
  amount: number, 
  jobsCount: number
): Promise<boolean> {
  try {
    const logoUrl = "https://oykpslopjzjhfwepxowp.supabase.co/storage/v1/object/public/assets/lawnconnect-logo.png";
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
            <img src="${logoUrl}" alt="LawnConnect" style="height: 60px; margin-bottom: 15px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payout Processed!</h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Hi ${providerName},
            </p>
            
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Great news! Your biweekly payout has been processed.
            </p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <div style="text-align: center;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 5px 0;">Payout Amount</p>
                <p style="color: #15803d; font-size: 32px; font-weight: bold; margin: 0;">J$${amount.toLocaleString('en-JM', { minimumFractionDigits: 2 })}</p>
                <p style="color: #666; font-size: 14px; margin-top: 10px;">For ${jobsCount} completed job${jobsCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              This payout covers all jobs completed since your last payout. Keep up the great work!
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://lawnconnect.jm/earnings" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600;">
                View Earnings Dashboard
              </a>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} LawnConnect. All rights reserved.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
              Questions? Contact us at support@lawnconnect.jm
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "LawnConnect <notifications@lawnconnect.jm>",
      to: [providerEmail],
      subject: `Payout Processed - J$${amount.toLocaleString('en-JM', { minimumFractionDigits: 2 })}`,
      html: emailHtml,
    });

    if (error) {
      console.error(`Error sending payout email to ${providerEmail}:`, error);
      return false;
    }

    console.log(`Payout notification sent to ${providerEmail}`);
    return true;
  } catch (err) {
    console.error(`Exception sending payout email:`, err);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting biweekly provider autopay process...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Check if it's been at least 14 days since last payout run (biweekly)
    const { data: lastPayout } = await supabase
      .from('provider_payouts')
      .select('payout_date')
      .order('payout_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPayout) {
      const lastPayoutDate = new Date(lastPayout.payout_date);
      const daysSinceLastPayout = Math.floor(
        (Date.now() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastPayout < 14) {
        console.log(`Only ${daysSinceLastPayout} days since last payout. Skipping (need 14 days for biweekly).`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Skipped - only ${daysSinceLastPayout} days since last payout (biweekly = 14 days)`,
            skipped: true,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Get all providers with completed jobs that haven't been paid out
    // Find jobs that are:
    // 1. Completed (status = 'completed')
    // 2. Not already included in a previous payout
    
    // First, get the job IDs that have already been paid out
    const { data: existingPayouts } = await supabase
      .from('provider_payouts')
      .select('job_ids');
    
    const paidJobIds = new Set<string>();
    if (existingPayouts) {
      for (const payout of existingPayouts) {
        if (payout.job_ids && Array.isArray(payout.job_ids)) {
          payout.job_ids.forEach((id: string) => paidJobIds.add(id));
        }
      }
    }
    console.log(`Found ${paidJobIds.size} previously paid job IDs`);

    // Get all completed jobs with accepted providers
    const { data: completedJobs, error: jobsError } = await supabase
      .from('job_requests')
      .select('id, accepted_provider_id, final_price, provider_payout, completed_at')
      .eq('status', 'completed')
      .not('accepted_provider_id', 'is', null)
      .not('completed_at', 'is', null);

    if (jobsError) {
      console.error("Error fetching completed jobs:", jobsError);
      throw new Error(`Failed to fetch completed jobs: ${jobsError.message}`);
    }

    console.log(`Found ${completedJobs?.length || 0} total completed jobs`);

    // Filter out already paid jobs and group by provider
    const providerJobsMap = new Map<string, { jobs: typeof completedJobs, totalPayout: number }>();

    for (const job of completedJobs || []) {
      // Skip if already paid
      if (paidJobIds.has(job.id)) {
        continue;
      }

      const providerId = job.accepted_provider_id;
      const payout = job.provider_payout || (job.final_price ? job.final_price * NORMAL_PAYOUT_PERCENTAGE : 0);

      if (!providerJobsMap.has(providerId)) {
        providerJobsMap.set(providerId, { jobs: [], totalPayout: 0 });
      }

      const providerData = providerJobsMap.get(providerId)!;
      providerData.jobs.push(job);
      providerData.totalPayout += payout;
    }

    console.log(`Found ${providerJobsMap.size} providers with unpaid jobs`);

    const results: { providerId: string; success: boolean; amount: number; jobsCount: number; error?: string }[] = [];

    // Process payouts for each provider
    for (const [providerId, data] of providerJobsMap.entries()) {
      // Skip if no earnings (J$0)
      if (data.totalPayout <= 0) {
        console.log(`Skipping provider ${providerId} - no earnings (J$0)`);
        continue;
      }

      try {
        const jobIds = data.jobs.map(j => j.id);
        
        // Insert payout record
        const { error: insertError } = await supabase
          .from('provider_payouts')
          .insert({
            provider_id: providerId,
            amount: data.totalPayout,
            jobs_count: data.jobs.length,
            job_ids: jobIds,
            payout_date: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting payout for provider ${providerId}:`, insertError);
          results.push({ 
            providerId, 
            success: false, 
            amount: data.totalPayout, 
            jobsCount: data.jobs.length,
            error: insertError.message 
          });
          continue;
        }

        // Send notification email
        if (resend) {
          const providerInfo = await getProviderEmail(supabase, providerId);
          if (providerInfo) {
            await sendPayoutNotification(
              resend,
              providerInfo.email,
              providerInfo.name,
              data.totalPayout,
              data.jobs.length
            );
          }
        }

        console.log(`Processed payout for provider ${providerId}: J$${data.totalPayout} for ${data.jobs.length} jobs`);
        results.push({ 
          providerId, 
          success: true, 
          amount: data.totalPayout, 
          jobsCount: data.jobs.length 
        });

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing payout for provider ${providerId}:`, err);
        results.push({ 
          providerId, 
          success: false, 
          amount: data.totalPayout, 
          jobsCount: data.jobs.length,
          error: errorMessage 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalPaid = results.filter(r => r.success).reduce((sum, r) => sum + r.amount, 0);

    console.log(`Autopay complete: ${successCount} providers paid, total J$${totalPaid}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount} provider payouts`,
        totalPaid,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in autopay-provider-payouts:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
