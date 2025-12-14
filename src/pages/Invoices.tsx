import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Calendar, MapPin, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  job_id: string;
  job_title: string;
  job_location: string;
  parish: string;
  lawn_size: string | null;
  amount: number;
  platform_fee: number;
  payment_reference: string;
  payment_date: string;
  pdf_url: string | null;
  created_at: string;
}

export default function Invoices() {
  const { user } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', user?.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    // Generate PDF on-the-fly using the edge function
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          jobTitle: invoice.job_title,
          jobLocation: invoice.job_location,
          parish: invoice.parish,
          lawnSize: invoice.lawn_size,
          amount: invoice.amount,
          platformFee: invoice.platform_fee,
          paymentReference: invoice.payment_reference,
          paymentDate: invoice.payment_date,
        },
      });

      if (error) throw error;

      // Convert base64 to blob and download
      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Invoice History</h1>
              <p className="text-muted-foreground">View and download your payment receipts</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{invoice.invoice_number}</h3>
                            <Badge variant="outline" className="text-xs">
                              {invoice.job_title}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{invoice.job_location}, {invoice.parish}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(invoice.payment_date), 'PPP')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            Ref: {invoice.payment_reference}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:flex-col md:items-end">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(invoice.amount)}
                          </p>
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            Paid
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(invoice)}
                          className="shrink-0"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Receipt className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No invoices yet</h3>
                <p className="text-muted-foreground">
                  Your payment receipts will appear here after you make payments for jobs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
