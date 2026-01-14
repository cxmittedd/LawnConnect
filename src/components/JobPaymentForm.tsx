import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lock, CheckCircle, CreditCard, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JobPaymentFormProps {
  amount: number;
  jobTitle: string;
  lawnSize?: string;
  lawnSizeCost?: number;
  jobTypeCost?: number;
  onPaymentSuccess: (reference: string, cardInfo: { lastFour: string; name: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function JobPaymentForm({ amount, jobTitle, lawnSize, lawnSizeCost, jobTypeCost, onPaymentSuccess, onCancel, loading }: JobPaymentFormProps) {
  const [processing, setProcessing] = useState(false);

  const handleTestPayment = () => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      const reference = `TEST-${Date.now()}`;
      onPaymentSuccess(reference, { 
        lastFour: '4242', 
        name: 'Test Customer' 
      });
      setProcessing(false);
    }, 1500);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Secure Payment</CardTitle>
        </div>
        <CardDescription>
          Pay upfront to post your job. Funds are held in escrow until job completion.
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

          {/* Test Mode Alert */}
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>Test Mode:</strong> Payment processing is simulated. No real charges will be made.
            </AlertDescription>
          </Alert>

          {/* Test Payment Button */}
          <div className="space-y-4">
            <Button 
              onClick={handleTestPayment}
              className="w-full"
              disabled={processing || loading}
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : `Pay J$${amount.toLocaleString()} (Test)`}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Test payment will be processed instantly
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onCancel}
              disabled={processing || loading}
            >
              Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}