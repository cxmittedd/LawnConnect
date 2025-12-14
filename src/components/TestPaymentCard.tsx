import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { sendInvoice } from '@/lib/invoiceService';

interface TestPaymentCardProps {
  jobId: string;
  jobTitle: string;
  amount: number;
  providerId: string;
  customerId: string;
  providerName: string;
  paymentStatus: string;
  isCustomer: boolean;
  isProvider: boolean;
  jobLocation?: string;
  parish?: string;
  lawnSize?: string | null;
  platformFee?: number;
  onPaymentUpdate: () => void;
}

export function TestPaymentCard({
  jobId,
  jobTitle,
  amount,
  providerId,
  customerId,
  providerName,
  paymentStatus,
  isCustomer,
  isProvider,
  jobLocation,
  parish,
  lawnSize,
  platformFee,
  onPaymentUpdate,
}: TestPaymentCardProps) {
  const [processing, setProcessing] = useState(false);

  const handleTestPayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const paymentReference = `TEST-${Date.now()}`;
      
      const { error } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user?.id,
          payment_reference: paymentReference,
          status: 'in_progress',
        })
        .eq('id', jobId);

      if (error) throw error;

      // Notify provider about payment
      sendNotification({
        type: 'payment_confirmed',
        recipientId: providerId,
        jobTitle,
        jobId,
      });

      // Send invoice to customer
      if (user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', customerId)
          .single();
        
        const customerName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer'
          : 'Customer';

        sendInvoice({
          jobId,
          customerId,
          customerEmail: user.email,
          customerName,
          jobTitle,
          jobLocation: jobLocation || '',
          parish: parish || '',
          lawnSize: lawnSize || null,
          amount,
          platformFee: platformFee || Math.round(amount * 0.30),
          paymentReference,
        });
      }

      toast.success('Test payment successful! Job is now in progress.');
      onPaymentUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Awaiting Payment</Badge>;
      case 'paid':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment
            </CardTitle>
            <CardDescription>
              {paymentStatus === 'paid' 
                ? 'Payment completed'
                : 'Complete payment to start the job'}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount to pay */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Amount Due</div>
          <div className="text-3xl font-bold text-primary">J${amount.toFixed(2)}</div>
        </div>

        {/* Customer View - Pending Payment */}
        {isCustomer && paymentStatus === 'pending' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Test Mode:</strong> This is a simulated payment. Click the button below to complete the test payment.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleTestPayment} 
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay J${amount.toFixed(2)} (Test)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Customer View - Paid */}
        {isCustomer && paymentStatus === 'paid' && (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription>
              <strong>Payment complete!</strong>
              <p className="mt-1 text-sm">
                {providerName} can now start working on your job.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Provider View - Pending */}
        {isProvider && paymentStatus === 'pending' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Waiting for customer to complete payment. The job will start once payment is received.
            </AlertDescription>
          </Alert>
        )}

        {/* Provider View - Paid */}
        {isProvider && paymentStatus === 'paid' && (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription>
              <strong>Payment received!</strong>
              <p className="mt-1 text-sm">
                You can now start working on this job.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
