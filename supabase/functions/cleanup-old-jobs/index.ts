import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cleanup function — DOES NOT delete completed jobs.
 *
 * Completed jobs (and their photos, reviews, messages, disputes, invoices)
 * are PERMANENT records required for:
 *  - Admin analytics (revenue, completed counts, monthly trends)
 *  - Provider earnings history
 *  - Customer invoices
 *  - Dispute history
 *
 * This function only purges abandoned UNPAID job drafts older than 14 days
 * (status='open' AND payment_status='pending'), which represent customers
 * who started posting a job but never paid.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== supabaseServiceKey) {
      const adminCheckClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error: authError } = await adminCheckClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: isAdmin } = await adminCheckClient.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffDateISO = cutoffDate.toISOString();

    console.log(`Cleaning up abandoned UNPAID job drafts older than: ${cutoffDateISO}`);

    // Only target abandoned unpaid drafts.
    // Completed jobs are PRESERVED forever for financial records.
    const { data: jobsToDelete, error: fetchError } = await supabase
      .from('job_requests')
      .select('id, title, created_at, status, payment_status')
      .eq('status', 'open')
      .eq('payment_status', 'pending')
      .is('accepted_provider_id', null)
      .lt('created_at', cutoffDateISO);

    if (fetchError) {
      console.error('Error fetching jobs to delete:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${jobsToDelete?.length || 0} abandoned unpaid drafts older than 14 days`);

    if (!jobsToDelete || jobsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No abandoned unpaid drafts to delete',
          deletedCount: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobIds = jobsToDelete.map((job) => job.id);

    // Abandoned drafts shouldn't have these, but clean up defensively.
    await supabase.from('job_photos').delete().in('job_id', jobIds);
    await supabase.from('messages').delete().in('job_id', jobIds);

    const { error: deleteError } = await supabase
      .from('job_requests')
      .delete()
      .in('id', jobIds);

    if (deleteError) {
      console.error('Error deleting jobs:', deleteError);
      throw deleteError;
    }

    console.log(`Deleted ${jobsToDelete.length} abandoned unpaid drafts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${jobsToDelete.length} abandoned unpaid drafts older than 14 days`,
        deletedCount: jobsToDelete.length,
        deletedJobIds: jobIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-old-jobs function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
