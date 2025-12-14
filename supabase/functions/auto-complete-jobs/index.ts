import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find jobs in pending_completion status where provider_completed_at is older than 30 hours
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    
    console.log(`Checking for jobs pending completion before: ${thirtyHoursAgo}`);

    const { data: pendingJobs, error: fetchError } = await supabase
      .from("job_requests")
      .select("id, title, customer_id, accepted_provider_id, final_price")
      .eq("status", "pending_completion")
      .lt("provider_completed_at", thirtyHoursAgo);

    if (fetchError) {
      console.error("Error fetching pending jobs:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingJobs?.length || 0} jobs to auto-complete`);

    const results = [];

    for (const job of pendingJobs || []) {
      try {
        // Get provider's dispute count this month to determine payout percentage
        const { data: disputeCount } = await supabase
          .rpc("get_provider_disputes_this_month", { provider_id: job.accepted_provider_id });

        const payoutPercentage = (disputeCount || 0) >= 3 ? 0.60 : 0.70;
        const platformFee = job.final_price * (1 - payoutPercentage);
        const providerPayout = job.final_price * payoutPercentage;

        // Auto-complete the job
        const { error: updateError } = await supabase
          .from("job_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            platform_fee: platformFee,
            provider_payout: providerPayout,
          })
          .eq("id", job.id);

        if (updateError) {
          console.error(`Error auto-completing job ${job.id}:`, updateError);
          results.push({ jobId: job.id, success: false, error: updateError.message });
          continue;
        }

        console.log(`Auto-completed job ${job.id} - Provider payout: ${providerPayout} (${payoutPercentage * 100}%)`);

        // Send notification to customer about auto-completion
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "job_completed",
              recipientId: job.customer_id,
              jobTitle: job.title,
              jobId: job.id,
              additionalData: {
                autoCompleted: true,
              },
            },
          });
        } catch (notifError) {
          console.error(`Failed to send auto-complete notification for job ${job.id}:`, notifError);
        }

        // Send notification to provider about completion and payout
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "payment_confirmed",
              recipientId: job.accepted_provider_id,
              jobTitle: job.title,
              jobId: job.id,
              additionalData: {
                amount: providerPayout,
                autoCompleted: true,
              },
            },
          });
        } catch (notifError) {
          console.error(`Failed to send provider notification for job ${job.id}:`, notifError);
        }

        results.push({ jobId: job.id, success: true, providerPayout });
      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        results.push({ jobId: job.id, success: false, error: String(jobError) });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} jobs`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in auto-complete-jobs function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
