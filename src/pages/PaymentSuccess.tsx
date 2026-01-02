import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transactionId = searchParams.get('transactionId') || searchParams.get('oid');
  const orderId = searchParams.get('orderId') || searchParams.get('oid');
  const jobId = searchParams.get('jobId');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!transactionId && !orderId) {
        // If no transaction info, assume success from redirect
        setVerifying(false);
        setVerified(true);
        return;
      }

      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: {
            transactionId,
            orderId,
            jobId
          }
        });

        if (verifyError) {
          console.error('Verification error:', verifyError);
          setError('Unable to verify payment. Please contact support.');
          setVerified(false);
        } else if (data?.verified || data?.success) {
          setVerified(true);
          toast.success('Payment verified successfully!');
        } else {
          setError('Payment verification failed. Please contact support.');
          setVerified(false);
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('An error occurred while verifying payment.');
        setVerified(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [transactionId, orderId, jobId]);

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              {verifying ? (
                <>
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  </div>
                  <CardTitle>Verifying Payment</CardTitle>
                  <CardDescription>Please wait while we confirm your payment...</CardDescription>
                </>
              ) : verified ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-success/20 p-4">
                      <CheckCircle className="h-16 w-16 text-success" />
                    </div>
                  </div>
                  <CardTitle className="text-success">Payment Successful!</CardTitle>
                  <CardDescription>
                    Your payment has been processed and your job has been posted.
                  </CardDescription>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-warning/20 p-4">
                      <CheckCircle className="h-16 w-16 text-warning" />
                    </div>
                  </div>
                  <CardTitle>Payment Processing</CardTitle>
                  <CardDescription>
                    {error || 'Your payment is being processed. You will receive a confirmation email shortly.'}
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!verifying && (
                <>
                  {transactionId && (
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">{transactionId}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {jobId ? (
                      <Button asChild className="w-full">
                        <Link to={`/jobs/${jobId}`}>
                          View Job Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link to="/my-jobs">
                          View My Jobs
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/dashboard">
                        <Home className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </Link>
                    </Button>
                  </div>

                  {verified && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      A confirmation email with your invoice has been sent to your email address.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
