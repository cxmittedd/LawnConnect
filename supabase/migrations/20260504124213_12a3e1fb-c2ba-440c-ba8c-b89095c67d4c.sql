-- Unschedule any cron jobs that call the destructive cleanup-old-jobs function.
-- Completed jobs and their related data must NEVER be auto-deleted.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE command ILIKE '%cleanup-old-jobs%'
       OR jobname ILIKE '%cleanup-old-jobs%'
       OR jobname ILIKE '%cleanup_old_jobs%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
    RAISE NOTICE 'Unscheduled cron job: % (id=%)', r.jobname, r.jobid;
  END LOOP;
END $$;