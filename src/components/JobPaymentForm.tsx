import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Lock, CheckCircle, CreditCard, Loader2, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { safeToast } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface AppliedCoupon {
  id: string;
  discount_percentage: number;
  label: string;
  code: string;
}

interface JobPaymentFormProps {
  amount: number;
  jobTitle: string;
  lawnSize?: string;
  lawnSizeCost?: number;
  jobTypeCost?: number;
  discountAmount?: number;
  discountLabel?: string;
  jobId: string;
  customerEmail: string;
  customerName?: string;
  onPaymentSuccess: (reference: string, cardInfo: { lastFour: string; name: string }) => void;
  onPaymentFailed?: (jobId: string) => void;
  onCancel: () => void;
  loading?: boolean;
  appliedCoupon?: AppliedCoupon | null;
  onApplyCoupon?: (coupon: AppliedCoupon) => void;
  onRemoveCoupon?: () => void;
  smallLotOnly?: boolean;
  isSmallLot?: boolean;
}

interface EzeePaymentData {
  platform: string;
  token: string;
  amount: number;
  currency: string;
  order_id: string;
  email_address: string;
  customer_name: string;
  description: string;
}

export function JobPaymentForm({ 
  amount, 
  jobTitle, 
  lawnSize, 
  lawnSizeCost, 
  jobTypeCost, 
  discountAmount,
  discountLabel,
  jobId,
  customerEmail,
  customerName,
  onPaymentSuccess,
  onPaymentFailed,
  onCancel, 
  loading,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  smallLotOnly,
  isSmallLot,
}: JobPaymentFormProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<EzeePaymentData | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentComplete = urlParams.get('payment_complete');
    const urlOrderId = urlParams.get('order_id');
    
    if ((paymentComplete === 'true' && urlOrderId === jobId) || 
        (paymentComplete === 'true' && !urlOrderId)) {
      checkPaymentStatusWithRetry(jobId);
    }
  }, [jobId]);

  useEffect(() => {
    const checkOnMount = async () => {
      if (jobId && !paymentData && !processing) {
        const { data: job } = await supabase
          .from('job_requests')
          .select('payment_status')
          .eq('id', jobId)
          .single();
        
        if (job?.payment_status === 'paid' || job?.payment_status === 'failed') {
          checkPaymentStatusWithRetry(jobId);
        }
      }
    };
    checkOnMount();
  }, [jobId]);

  const checkPaymentStatusWithRetry = async (orderId: string, retries = 5, delay = 1000) => {
    setCheckingStatus(true);
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data: job, error } = await supabase
          .from('job_requests')
          .select('payment_status, payment_reference')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (job?.payment_status === 'paid') {
          // Mark coupon as used if one was applied
          if (appliedCoupon) {
            await supabase.from('customer_discounts').update({
              used: true,
              used_at: new Date().toISOString(),
              used_on_job_id: orderId,
            }).eq('id', appliedCoupon.id);
          }
          setCheckingStatus(false);
          onPaymentSuccess(job.payment_reference || `EZEE-${Date.now()}`, {
            lastFour: '****',
            name: customerName || 'Customer'
          });
          return;
        } else if (job?.payment_status === 'failed') {
          setCheckingStatus(false);
          onPaymentFailed?.(orderId);
          return;
        }
        
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }
    
    setCheckingStatus(false);
    safeToast.error('Payment verification timed out. Please check your job status.');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !user) return;
    setApplyingCoupon(true);

    const { data, error } = await supabase
      .from('customer_discounts')
      .select('id, discount_percentage, label, code')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('customer_id', user.id)
      .eq('active', true)
      .eq('used', false)
      .maybeSingle();

    if (error || !data) {
      toast.error('Invalid or expired coupon code');
      setApplyingCoupon(false);
      return;
    }

    onApplyCoupon?.(data);
    setCouponCode('');
    toast.success('Coupon applied!');
    setApplyingCoupon(false);
  };

  const initiatePayment = async () => {
    setProcessing(true);

    try {
      const originUrl = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('ezeepay-create-token', {
        body: {
          amount: amount,
          order_id: jobId,
          customer_email: customerEmail,
          customer_name: customerName,
          description: `Payment for ${jobTitle}`,
          origin_url: originUrl,
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setPaymentUrl(data.payment_url);
      setPaymentData(data.payment_data);

      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 100);

    } catch (error) {
      console.error('Payment initialization error:', error);
      safeToast.error(error);
      setProcessing(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Verifying Payment...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your transaction</p>
        </CardContent>
      </Card>
    );
  }

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
              {discountAmount && discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>🎉 {discountLabel || 'Discount'}</span>
                  <span>-J${discountAmount.toLocaleString()}</span>
                </div>
              )}
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

          {/* Coupon Code Input */}
          {!appliedCoupon ? (
            <div className="border border-dashed border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Have a coupon code?</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  disabled={applyingCoupon}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                >
                  {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {appliedCoupon.code} — {appliedCoupon.discount_percentage}% off
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRemoveCoupon}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {smallLotOnly && !isSmallLot && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ This coupon only applies to Small lot size. Select a Small lot to use this discount.
                </p>
              )}
            </div>
          )}

          {/* Hidden form for EzeePay redirect */}
          {paymentUrl && paymentData && (
            <form 
              ref={formRef}
              action={paymentUrl} 
              method="POST" 
              style={{ display: 'none' }}
            >
              <input type="hidden" name="platform" value={paymentData.platform} />
              <input type="hidden" name="token" value={paymentData.token} />
              <input type="hidden" name="amount" value={paymentData.amount} />
              <input type="hidden" name="currency" value={paymentData.currency} />
              <input type="hidden" name="order_id" value={paymentData.order_id} />
              <input type="hidden" name="email_address" value={paymentData.email_address} />
              <input type="hidden" name="customer_name" value={paymentData.customer_name} />
              <input type="hidden" name="description" value={paymentData.description} />
            </form>
          )}

          {/* Payment Button */}
          <div className="space-y-4">
            <Button 
              onClick={initiatePayment}
              className="w-full"
              disabled={processing || loading}
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting to Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay J${amount.toLocaleString()}
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              You will be redirected to EzeePay's secure payment page
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
