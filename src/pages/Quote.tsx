import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, MapPin, Ruler, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { JobPaymentForm } from '@/components/JobPaymentForm';
import { safeToast } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface QuoteDetails {
  title: string;
  description: string | null;
  parish: string;
  community: string | null;
  location: string;
  lawn_size: string | null;
  price: number;
  status: string;
  job_id: string | null;
  customer_name: string | null;
}

export default function Quote() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [autopayOptIn, setAutopayOptIn] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const { data, error: fnError } = await supabase.functions.invoke('custom-quote', {
        body: { action: 'view', token },
      });
      if (fnError || !data?.success) {
        setError(data?.error || 'This quote link is not valid.');
        setLoading(false);
        return;
      }
      setQuote(data.quote);
      setLoading(false);
    };
    load();
  }, [token]);

  // If the customer is coming back from checkout, jump straight to verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_complete') === 'true' && quote?.job_id && user) {
      setJobId(quote.job_id);
    }
  }, [quote, user]);

  const handleContinue = async () => {
    if (!user) {
      navigate(`/auth?next=/quote/${token}`);
      return;
    }
    setClaiming(true);
    const { data, error: fnError } = await supabase.functions.invoke('custom-quote', {
      body: { action: 'claim', token },
    });
    setClaiming(false);
    if (fnError || !data?.success) {
      safeToast.error(data?.error || 'Could not open this quote.');
      return;
    }
    setJobId(data.job_id);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-lg px-4 py-16 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-50" />
          <h1 className="text-xl font-semibold text-foreground">Quote unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error || 'This quote link is not valid.'}</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Go to homepage</Button>
        </main>
      </div>
    );
  }

  if (jobId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-2xl px-4 py-8">
          <JobPaymentForm
            amount={quote.price}
            jobTitle={quote.title}
            lawnSize={quote.lawn_size || undefined}
            jobId={jobId}
            customerEmail={user?.email || ''}
            customerName={quote.customer_name || undefined}
            returnPath={`/quote/${token}`}
            hideExtras
            autopayOptIn={autopayOptIn}
            onChangeAutopayOptIn={setAutopayOptIn}
            onPaymentSuccess={async () => {
              toast.success('Payment received — your job is booked!');
              if (autopayOptIn) {
                const { data, error: fnError } = await supabase.functions.invoke('custom-quote', {
                  body: { action: 'setup_autopay', token },
                });
                if (fnError || !data?.success) {
                  safeToast.error(data?.error || 'Your job is booked, but autopay could not be set up.');
                  navigate(`/job/${jobId}`);
                  return;
                }
                toast.success('Autopay added — finish setting up your card below');
                navigate('/autopay');
                return;
              }
              navigate(`/job/${jobId}`);
            }}
            onCancel={() => setJobId(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="rounded-2xl border-border/60 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Your LawnConnect Quote</CardTitle>
            <CardDescription>
              {quote.customer_name ? `Prepared for ${quote.customer_name}. ` : ''}
              Review the details below and pay securely to book the job.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Service</span>
                <span className="text-right font-medium text-foreground">{quote.title}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Address</span>
                <span className="text-right text-foreground">
                  {quote.location}
                  <br />
                  <span className="text-muted-foreground">
                    {quote.community ? `${quote.community}, ` : ''}{quote.parish}
                  </span>
                </span>
              </div>
              {quote.lawn_size && (
                <div className="flex items-start justify-between gap-4">
                  <span className="flex items-center gap-1 text-muted-foreground"><Ruler className="h-3.5 w-3.5" /> Lawn size</span>
                  <span className="text-right text-foreground">{quote.lawn_size}</span>
                </div>
              )}
              {quote.description && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-right text-foreground">{quote.description}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-lg font-semibold text-primary">J${quote.price.toLocaleString()}</span>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your payment is held until the job is completed, and your provider will complete it within 3 days.
            </p>

            <Button className="h-12 w-full rounded-xl" onClick={handleContinue} disabled={claiming}>
              {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {user ? 'Continue to Payment' : 'Sign in to Pay'}
            </Button>
            {!user && (
              <p className="text-center text-xs text-muted-foreground">
                You'll need a free LawnConnect account so you can track the job and get your receipt.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
