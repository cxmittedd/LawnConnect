import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Smartphone, CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LynkPaymentCardProps {
  jobId: string;
  amount: number;
  providerLynkId: string | null;
  providerName: string;
  paymentStatus: string;
  paymentReference: string | null;
  isCustomer: boolean;
  isProvider: boolean;
  onPaymentUpdate: () => void;
}

export function LynkPaymentCard({
  jobId,
  amount,
  providerLynkId,
  providerName,
  paymentStatus,
  paymentReference,
  isCustomer,
  isProvider,
  onPaymentUpdate,
}: LynkPaymentCardProps) {
  const [reference, setReference] = useState(paymentReference || '');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleSubmitReference = async () => {
    if (!reference.trim()) {
      toast.error('Please enter your Lynk transaction reference');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          payment_reference: reference.trim(),
          payment_status: 'awaiting_confirmation',
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Payment reference submitted! Waiting for provider confirmation.');
      onPaymentUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment reference');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user?.id,
          status: 'in_progress',
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Payment confirmed! Job is now in progress.');
      setConfirmDialog(false);
      onPaymentUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Awaiting Payment</Badge>;
      case 'awaiting_confirmation':
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Awaiting Confirmation</Badge>;
      case 'paid':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>;
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Lynk Payment
              </CardTitle>
              <CardDescription>
                {paymentStatus === 'paid' 
                  ? 'Payment has been confirmed'
                  : 'Pay via Lynk mobile app'}
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
            <>
              {providerLynkId ? (
                <div className="space-y-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How to pay:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Open your Lynk app</li>
                        <li>Select "Send Money"</li>
                        <li>Enter the provider's Lynk ID below</li>
                        <li>Send J${amount.toFixed(2)}</li>
                        <li>Copy the transaction reference and enter it below</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Provider's Lynk ID</Label>
                    <div className="flex gap-2">
                      <Input value={providerLynkId} readOnly className="font-mono" />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(providerLynkId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Send payment to: {providerName}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Lynk Transaction Reference</Label>
                    <Input
                      id="reference"
                      placeholder="Enter your Lynk transaction reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll find this in your Lynk app after sending the payment
                    </p>
                  </div>

                  <Button 
                    onClick={handleSubmitReference} 
                    disabled={submitting || !reference.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Submitting...' : 'I Have Paid - Submit Reference'}
                  </Button>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The provider hasn't set up their Lynk ID yet. Please wait for them to update their profile or contact them directly.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Customer View - Awaiting Confirmation */}
          {isCustomer && paymentStatus === 'awaiting_confirmation' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Payment submitted!</strong>
                <p className="mt-1 text-sm">
                  Reference: <span className="font-mono">{paymentReference}</span>
                </p>
                <p className="mt-1 text-sm">
                  Waiting for {providerName} to confirm receipt. The job will start once payment is confirmed.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer View - Paid */}
          {isCustomer && paymentStatus === 'paid' && (
            <Alert className="border-success/50 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>Payment confirmed!</strong>
                <p className="mt-1 text-sm">
                  {providerName} has confirmed receipt of your payment. The job is now in progress.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Provider View - Pending */}
          {isProvider && paymentStatus === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Waiting for customer to make payment via Lynk.
                {!providerLynkId && (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    ⚠️ You haven't set up your Lynk ID! Update your profile so customers can pay you.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Provider View - Awaiting Confirmation */}
          {isProvider && paymentStatus === 'awaiting_confirmation' && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Customer has submitted payment!</strong>
                  <p className="mt-2 text-sm">
                    Reference: <span className="font-mono font-bold">{paymentReference}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Please check your Lynk app to verify you received J${amount.toFixed(2)}.
                  </p>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => setConfirmDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Payment Received
              </Button>
            </div>
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

          {/* Lynk App Link */}
          <div className="pt-2 border-t">
            <a 
              href="https://www.lynk.us/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Don't have Lynk? Download the app
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Provider Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Receipt</DialogTitle>
            <DialogDescription>
              Please verify that you received <strong>J${amount.toFixed(2)}</strong> via Lynk with reference <strong className="font-mono">{paymentReference}</strong>.
              <br /><br />
              Once confirmed, the job will be marked as "In Progress" and you can begin work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={submitting}>
              {submitting ? 'Confirming...' : 'Yes, Payment Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
