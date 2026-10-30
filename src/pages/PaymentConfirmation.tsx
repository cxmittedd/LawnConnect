import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { CheckCircle2, Clock, XCircle, Download, Loader2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type Job = {
  id: string;
  title: string;
  location: string;
  parish: string;
  lawn_size: string | null;
  preferred_date: string | null;
  final_price: number | null;
  payment_status: string | null;
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  created_at: string | null;
};

const fmt = (n: number | null) => `J$${(n ?? 0).toLocaleString('en-JM', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

export default function PaymentConfirmation() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Customer');

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    let tries = 0;
    const load = async () => {
      const { data } = await supabase
        .from('job_requests')
        .select('id,title,location,parish,lawn_size,preferred_date,final_price,payment_status,payment_reference,payment_confirmed_at,created_at')
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setJob(data as Job | null);
      setLoading(false);
      // Keep checking briefly while the payment is still being confirmed
      if (data && data.payment_status === 'pending' && tries++ < 10) setTimeout(load, 3000);
    };
    load();
    supabase.from('profiles').select('first_name,last_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      const n = `${data?.first_name || ''} ${data?.last_name || ''}`.trim();
      if (n && !cancelled) setName(n);
    });
    return () => { cancelled = true; };
  }, [id, user]);

  const downloadReceipt = () => {
    if (!job) return;
    const doc = new jsPDF();
    let y = 22;
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text('LawnConnect', 20, y);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text('Payment Receipt', 20, (y += 8));
    doc.text('connectlawn.com', 190, 22, { align: 'right' });
    doc.line(20, (y += 6), 190, y);
    const rows: [string, string][] = [
      ['Receipt no.', (job.payment_reference || job.id.slice(0, 8)).toUpperCase()],
      ['Date paid', fmtDate(job.payment_confirmed_at || job.created_at)],
      ['Billed to', name],
      ['Email', user?.email || ''],
      ['Service', job.title],
      ['Lawn size', job.lawn_size || '—'],
      ['Address', `${job.location}, ${job.parish}`],
      ['Preferred date', fmtDate(job.preferred_date)],
      ['Status', 'Paid'],
    ];
    y += 10;
    rows.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold'); doc.text(k, 20, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(v, 120);
      doc.text(lines, 70, y);
      y += 8 * lines.length;
    });
    doc.line(20, (y += 2), 190, y);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Total paid', 20, (y += 10));
    doc.text(fmt(job.final_price), 190, y, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Thank you for booking with LawnConnect.', 20, (y += 16));
    doc.save(`LawnConnect-receipt-${job.id.slice(0, 8)}.pdf`);
  };

  const status = job?.payment_status;
  const paid = status === 'paid';
  const failed = status === 'failed' || status === 'refunded';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-xl px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !job ? (
          <Card className="rounded-2xl"><CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">We couldn't find this payment.</p>
            <Button asChild><Link to="/my-jobs">Go to My Jobs</Link></Button>
          </CardContent></Card>
        ) : (
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-3">
                {paid ? <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
                  : failed ? <XCircle className="mx-auto h-16 w-16 text-destructive" />
                  : <Clock className="mx-auto h-16 w-16 text-muted-foreground" />}
                <h1 className="text-2xl font-bold">
                  {paid ? 'Payment successful' : failed ? `Payment ${status}` : 'Confirming your payment…'}
                </h1>
                <p className="text-muted-foreground">
                  {paid ? 'Your lawn cut is booked. A provider will complete it on your preferred date or within 3 days.'
                    : failed ? 'Your payment did not go through. You have not been charged for this booking.'
                    : 'This usually takes a few seconds. This page will update automatically.'}
                </p>
              </div>
              <Separator />
              <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Service</dt><dd className="text-right font-medium">{job.title}</dd>
                <dt className="text-muted-foreground">Address</dt><dd className="text-right">{job.location}, {job.parish}</dd>
                <dt className="text-muted-foreground">Preferred date</dt><dd className="text-right">{fmtDate(job.preferred_date)}</dd>
                <dt className="text-muted-foreground">Reference</dt><dd className="text-right break-all">{job.payment_reference || '—'}</dd>
                <dt className="font-semibold">Total</dt><dd className="text-right text-lg font-bold">{fmt(job.final_price)}</dd>
              </dl>
              <div className="flex flex-col gap-3">
                {paid && (
                  <Button size="lg" className="rounded-xl" onClick={downloadReceipt}>
                    <Download className="mr-2 h-4 w-4" /> Download receipt
                  </Button>
                )}
                <Button asChild variant="outline" size="lg" className="rounded-xl">
                  <Link to={`/job/${job.id}`}>View job details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
