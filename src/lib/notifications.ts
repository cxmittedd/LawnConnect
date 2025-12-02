import { supabase } from '@/integrations/supabase/client';

type NotificationType = 
  | 'proposal_received'
  | 'proposal_accepted'
  | 'payment_submitted'
  | 'payment_confirmed'
  | 'job_completed'
  | 'review_received';

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
