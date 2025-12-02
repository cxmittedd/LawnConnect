import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const checkoutSchema = z.object({
  invoice_id: z.string().min(1, 'Please select an invoice'),
  card_number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  card_name: z.string().trim().min(1, 'Cardholder name is required'),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Expiry must be in MM/YY format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
});

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  status: string;
}

export default function Checkout() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    card_number: '',
    card_name: '',
    expiry: '',
    cvv: '',
  });

  useEffect(() => {
    loadPendingInvoices();
  }, [user]);

  const loadPendingInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === formData.invoice_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Update invoice status to paid
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', formData.invoice_id);

      if (error) throw error;

      setPaymentSuccess(true);
      toast.success('Payment processed successfully!');
      
      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          invoice_id: '',
          card_number: '',
          card_name: '',
          expiry: '',
          cvv: '',
        });
        setPaymentSuccess(false);
        loadPendingInvoices();
      }, 3000);
    } catch (error: any) {
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 16);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (paymentSuccess) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground text-center">
                Your payment has been processed successfully. The invoice has been marked as paid.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Checkout</h1>
            <p className="text-muted-foreground">Process payment for pending invoices</p>
          </div>

          {invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No pending invoices to pay</p>
                <Button onClick={() => window.location.href = '/invoices'}>
                  View All Invoices
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Invoice</CardTitle>
                  <CardDescription>Choose the invoice you want to pay</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.invoice_id}
                    onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.client_name} - $
                          {invoice.amount.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedInvoice && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount to pay:</span>
                        <span className="text-2xl font-bold text-primary">
                          ${selectedInvoice.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>This is a simulated payment form</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card_number">Card Number</Label>
                    <Input
                      id="card_number"
                      placeholder="1234 5678 9012 3456"
                      value={formData.card_number}
                      onChange={(e) =>
                        setFormData({ ...formData, card_number: formatCardNumber(e.target.value) })
                      }
                      required
                      maxLength={16}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card_name">Cardholder Name</Label>
                    <Input
                      id="card_name"
                      placeholder="John Doe"
                      value={formData.card_name}
                      onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={formData.expiry}
                        onChange={(e) =>
                          setFormData({ ...formData, expiry: formatExpiry(e.target.value) })
                        }
                        required
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={formData.cvv}
                        onChange={(e) =>
                          setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })
                        }
                        required
                        maxLength={4}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={processing || !formData.invoice_id}>
                {processing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay {selectedInvoice ? `$${selectedInvoice.amount.toFixed(2)}` : ''}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
