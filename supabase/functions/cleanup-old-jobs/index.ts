import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    const expectedServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!authHeader || 
        (!authHeader.includes(expectedServiceKey || '') && 
         !authHeader.includes(expectedAnonKey || ''))) {
      console.log('Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date (14 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffDateISO = cutoffDate.toISOString();

    console.log(`Cleaning up completed jobs older than: ${cutoffDateISO}`);

    // First, get the jobs that will be deleted for logging
    const { data: jobsToDelete, error: fetchError } = await supabase
      .from('job_requests')
      .select('id, title, completed_at')
      .eq('status', 'completed')
      .lt('completed_at', cutoffDateISO);

    if (fetchError) {
      console.error('Error fetching jobs to delete:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${jobsToDelete?.length || 0} completed jobs older than 14 days`);

    if (!jobsToDelete || jobsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old completed jobs to delete',
          deletedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobIds = jobsToDelete.map(job => job.id);

    // Delete related records first (due to foreign key constraints)
    // Delete job_completion_photos
    const { error: photosError } = await supabase
      .from('job_completion_photos')
      .delete()
      .in('job_id', jobIds);

    if (photosError) {
      console.error('Error deleting completion photos:', photosError);
    }

    // Delete job_photos
    const { error: jobPhotosError } = await supabase
      .from('job_photos')
      .delete()
      .in('job_id', jobIds);

    if (jobPhotosError) {
      console.error('Error deleting job photos:', jobPhotosError);
    }

    // Delete messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('job_id', jobIds);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // Delete job_proposals
    const { error: proposalsError } = await supabase
      .from('job_proposals')
      .delete()
      .in('job_id', jobIds);

    if (proposalsError) {
      console.error('Error deleting proposals:', proposalsError);
    }

    // Delete reviews
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .in('job_id', jobIds);

    if (reviewsError) {
      console.error('Error deleting reviews:', reviewsError);
    }

    // Get dispute IDs first for deleting dispute-related records
    const { data: disputes } = await supabase
      .from('job_disputes')
      .select('id')
      .in('job_id', jobIds);

    if (disputes && disputes.length > 0) {
      const disputeIds = disputes.map(d => d.id);

      // Delete dispute_photos
      const { error: disputePhotosError } = await supabase
        .from('dispute_photos')
        .delete()
        .in('dispute_id', disputeIds);

      if (disputePhotosError) {
        console.error('Error deleting dispute photos:', disputePhotosError);
      }

      // Get dispute_responses for deleting response photos
      const { data: responses } = await supabase
        .from('dispute_responses')
        .select('id')
        .in('dispute_id', disputeIds);

      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);

        // Delete dispute_response_photos
        const { error: responsePhotosError } = await supabase
          .from('dispute_response_photos')
          .delete()
          .in('response_id', responseIds);

        if (responsePhotosError) {
          console.error('Error deleting dispute response photos:', responsePhotosError);
        }
      }

      // Delete dispute_responses
      const { error: responsesError } = await supabase
        .from('dispute_responses')
        .delete()
        .in('dispute_id', disputeIds);

      if (responsesError) {
        console.error('Error deleting dispute responses:', responsesError);
      }

      // Delete job_disputes
      const { error: disputesError } = await supabase
        .from('job_disputes')
        .delete()
        .in('job_id', jobIds);

      if (disputesError) {
        console.error('Error deleting disputes:', disputesError);
      }
    }

    // Note: We're NOT deleting invoices as they should be kept for financial records

    // Finally, delete the job requests
    const { error: deleteError, count } = await supabase
      .from('job_requests')
      .delete()
      .in('id', jobIds);

    if (deleteError) {
      console.error('Error deleting jobs:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${jobsToDelete.length} old completed jobs and related records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${jobsToDelete.length} completed jobs older than 14 days`,
        deletedCount: jobsToDelete.length,
        deletedJobIds: jobIds
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
