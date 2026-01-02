import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Lock, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HostedPaymentButtonProps {
  amount: number;
  jobTitle: string;
  lawnSize?: string;
  lawnSizeCost?: number;
  jobTypeCost?: number;
  jobData: {
    title: string;
    description?: string;
    location: string;
    parish: string;
    lawn_size?: string;
    preferred_date?: string;
    preferred_time?: string;
    additional_requirements?: string;
  };
  customerId: string;
  customerEmail?: string;
  onCancel: () => void;
  loading?: boolean;
}

export function HostedPaymentButton({
  amount,
  jobTitle,
  lawnSize,
  lawnSizeCost,
  jobTypeCost,
  jobData,
  customerId,
  customerEmail,
  onCancel,
  loading
}: HostedPaymentButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [hppFormData, setHppFormData] = useState<{ hppUrl: string; formData: Record<string, string> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handlePayNow = async () => {
    setProcessing(true);

    try {
      // First, create a pending job record
      const platformFee = Math.round(amount * 0.30);
      const providerPayout = amount - platformFee;
      const orderId = `JOB-${Date.now()}`;

      const { data: job, error: jobError } = await supabase
        .from('job_requests')
        .insert({
          customer_id: customerId,
          title: jobData.title,
          description: jobData.description || null,
          location: jobData.location,
          parish: jobData.parish,
          lawn_size: jobData.lawn_size || null,
          preferred_date: jobData.preferred_date || null,
          preferred_time: jobData.preferred_time || null,
          additional_requirements: jobData.additional_requirements || null,
          base_price: lawnSizeCost || amount,
          final_price: amount,
          platform_fee: platformFee,
          provider_payout: providerPayout,
          payment_status: 'pending',
          status: 'open'  // Jobs start as 'open' until provider accepts
        })
        .select()
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        toast.error('Failed to create job. Please try again.');
        setProcessing(false);
        return;
      }

      // Generate payment URL
      const successUrl = `${window.location.origin}/payment-success?jobId=${job.id}`;
      const failureUrl = `${window.location.origin}/payment-failure?jobId=${job.id}`;

      const { data, error } = await supabase.functions.invoke('create-payment-url', {
        body: {
          amount,
          currency: 'JMD',
          orderId: `${orderId}-${job.id.substring(0, 8)}`,
          jobId: job.id,
          customerId,
          customerEmail,
          jobTitle,
          successUrl,
          failureUrl
        }
      });

      if (error) {
        console.error('Error creating payment URL:', error);
        // Clean up the pending job
        await supabase.from('job_requests').delete().eq('id', job.id);
        toast.error('Failed to initiate payment. Please try again.');
        setProcessing(false);
        return;
      }

      // Handle HPP form submission fallback
      if (data?.useHPP && data?.hppUrl && data?.formData) {
        console.log('Using HPP form submission fallback');
        
        // Store form data for manual fallback
        setHppFormData({ hppUrl: data.hppUrl, formData: data.formData });
        
        // Try automatic form submission first
        try {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.hppUrl;
          form.target = '_self';
          
          Object.entries(data.formData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = String(value);
              form.appendChild(input);
            }
          });
          
          document.body.appendChild(form);
          
          // Set a timeout to show manual fallback if redirect doesn't happen
          setTimeout(() => {
            setShowManualPayment(true);
            setProcessing(false);
          }, 3000);
          
          form.submit();
        } catch (formError) {
          console.error('Form submission failed:', formError);
          setShowManualPayment(true);
          setProcessing(false);
        }
        return;
      }

      if (!data?.paymentUrl) {
        console.error('No payment URL returned:', data);
        await supabase.from('job_requests').delete().eq('id', job.id);
        toast.error('Payment service unavailable. Please try again later.');
        setProcessing(false);
        return;
      }

      // Redirect to Fiserv hosted payment page
      toast.success('Redirecting to secure payment page...');
      window.location.href = data.paymentUrl;

    } catch (err) {
      console.error('Payment initiation error:', err);
      toast.error('An error occurred. Please try again.');
      setProcessing(false);
    }
  };

  const handleManualPayment = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Secure Payment</CardTitle>
        </div>
        <CardDescription>
          Pay upfront to post your job. You'll be redirected to our secure payment partner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {lawnSize && lawnSizeCost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lawn Size: {lawnSize}</span>
                  <span className="text-foreground">J${lawnSizeCost.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Type: {jobTitle}</span>
                <span className="text-foreground">
                  {jobTypeCost && jobTypeCost > 0 ? `+J$${jobTypeCost.toLocaleString()}` : 'Included'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Total</span>
                <span className="text-primary text-lg">J${amount.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Protected by escrow - money released only after job completion
            </p>
          </div>

          {/* Secure Payment Notice */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
            <p className="text-sm text-primary font-medium">
              🔒 Secure Payment Processing
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be redirected to our secure payment partner to complete your transaction
            </p>
          </div>

          {/* Payment Methods Info */}
          <div className="flex items-center justify-center gap-4 py-2">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Visa, Mastercard, and more accepted
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={onCancel}
              disabled={processing || loading}
            >
              Back
            </Button>
            <Button 
              type="button" 
              className="flex-1"
              onClick={handlePayNow}
              disabled={processing || loading}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Pay J${amount.toLocaleString()}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Manual Payment Fallback Dialog */}
      <Dialog open={showManualPayment} onOpenChange={setShowManualPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Complete Your Payment
            </DialogTitle>
            <DialogDescription>
              Your browser may have blocked the automatic redirect. Click the button below to continue to the secure payment page.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">Amount: <span className="text-primary">J${amount.toLocaleString()}</span></p>
              <p className="text-xs text-muted-foreground mt-1">{jobTitle}</p>
            </div>

            {hppFormData && (
              <form 
                ref={formRef}
                method="POST" 
                action={hppFormData.hppUrl}
                target="_blank"
              >
                {Object.entries(hppFormData.formData).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={String(value)} />
                ))}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Continue to Payment
                </Button>
              </form>
            )}

            <p className="text-xs text-center text-muted-foreground">
              🔒 You'll be taken to our secure payment partner (Fiserv)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
