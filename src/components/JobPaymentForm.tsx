import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';

interface JobPaymentFormProps {
  amount: number;
  jobTitle: string;
  onPaymentSuccess: (reference: string, cardInfo: { lastFour: string; name: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function JobPaymentForm({ amount, jobTitle, onPaymentSuccess, onCancel, loading }: JobPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  const platformFee = Math.round(amount * 0.1);
  const providerPayout = amount - platformFee;

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g) || [];
    return groups.join(' ').slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (cardNumber.replace(/\s/g, '').length < 16) {
      return;
    }
    if (expiry.length < 5) {
      return;
    }
    if (cvv.length < 3) {
      return;
    }
    if (!cardName.trim()) {
      return;
    }

    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a test payment reference
    const reference = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Get last 4 digits of card
    const lastFour = cardNumber.replace(/\s/g, '').slice(-4);
    
    onPaymentSuccess(reference, { lastFour, name: cardName });
    setProcessing(false);
  };

  const isFormValid = 
    cardNumber.replace(/\s/g, '').length >= 16 &&
    expiry.length >= 5 &&
    cvv.length >= 3 &&
    cardName.trim().length > 0;

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
              <div className="flex justify-between">
                <span className="text-muted-foreground">{jobTitle}</span>
                <span className="text-foreground">J${amount.toLocaleString()}</span>
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

          {/* Test Mode Banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              🧪 Test Mode - No real payment will be processed
            </p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
              Use any card number (e.g., 4242 4242 4242 4242)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                disabled={processing || loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  disabled={processing || loading}
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  disabled={processing || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  type="password"
                  disabled={processing || loading}
                />
              </div>
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
                type="submit" 
                className="flex-1"
                disabled={!isFormValid || processing || loading}
              >
                {processing ? 'Processing...' : `Pay J$${amount.toLocaleString()}`}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
