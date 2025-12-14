import { supabase } from "@/integrations/supabase/client";

interface SendInvoiceParams {
  jobId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  jobTitle: string;
  jobLocation: string;
  parish: string;
  lawnSize: string | null;
  amount: number;
  platformFee: number;
  paymentReference: string;
}

export const sendInvoice = async (params: SendInvoiceParams): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-invoice', {
      body: {
        ...params,
        paymentDate: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Failed to send invoice:', error);
    } else {
      console.log('Invoice sent successfully for job:', params.jobId);
    }
  } catch (error) {
    console.error('Error sending invoice:', error);
  }
};
