import { supabase } from '@/integrations/supabase/client';

type NotificationType = 
  | 'proposal_received'
  | 'proposal_accepted'
  | 'payment_submitted'
  | 'payment_confirmed'
  | 'job_completed'
  | 'review_received'
  | 'late_completion_warning'
  | 'late_completion_apology'
  | 'completion_confirmation_needed'
  | 'dispute_opened'
  | 'dispute_response';

interface NotificationParams {
  type: NotificationType;
  recipientId: string;
  jobTitle: string;
  jobId: string;
  additionalData?: {
    providerName?: string;
    customerName?: string;
    amount?: number;
    rating?: number;
    lateJobsThisMonth?: number;
    preferredDate?: string;
    disputeReason?: string;
  };
}

export async function sendNotification(params: NotificationParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: params,
    });

    if (error) {
      console.error('Failed to send notification:', error);
    } else {
      console.log(`Notification sent: ${params.type} to ${params.recipientId}`);
    }
  } catch (error) {
    // Don't throw - notifications should fail silently to not disrupt main flow
    console.error('Error invoking notification function:', error);
  }
}
