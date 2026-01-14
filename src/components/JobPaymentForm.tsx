import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lock, CheckCircle, ExternalLink } from 'lucide-react';

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
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handlePayNowClick = () => {
    // Open EzeePay payment page in new tab
    window.open('https://secure-test.ezeepayments.com/?DHXgXFE', '_blank');
    setPaymentInitiated(true);
  };

  const handleConfirmPayment = () => {
    setConfirming(true);
    // Generate a reference for the payment
    const reference = `EZEE-${Date.now()}`;
    
    // Simulate brief processing
    setTimeout(() => {
      onPaymentSuccess(reference, { 
        lastFour: '****', 
        name: 'EzeePay Customer' 
      });
      setConfirming(false);
    }, 1000);
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

          {/* Payment Section */}
          <div className="space-y-4">
            {!paymentInitiated ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Click below to securely pay via EzeePay
                </p>
                
                {/* EzeePay Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handlePayNowClick}
                    disabled={loading}
                    className="transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img 
                      src="https://my-test.ezeepayments.com/btn-images/pay-now.png" 
                      alt="Pay Now with EzeePay"
                      className="h-12"
                    />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  You'll be redirected to EzeePay's secure payment page
                </p>
              </>
            ) : (
              <>
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center space-y-2">
                  <ExternalLink className="h-6 w-6 text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    Complete your payment on EzeePay
                  </p>
                  <p className="text-xs text-muted-foreground">
                    After completing payment, click the button below to confirm
                  </p>
                </div>

                <Button 
                  onClick={handleConfirmPayment}
                  className="w-full"
                  disabled={confirming || loading}
                >
                  {confirming ? 'Confirming...' : 'I\'ve Completed Payment'}
                </Button>

                <button
                  onClick={handlePayNowClick}
                  className="text-sm text-primary hover:underline w-full text-center"
                >
                  Open payment page again
                </button>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onCancel}
              disabled={confirming || loading}
            >
              Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
