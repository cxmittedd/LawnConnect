import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';

const invoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'Invoice number is required').max(50),
  client_name: z.string().trim().min(1, 'Client name is required').max(200),
  client_email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
  due_date: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    client_name: '',
    client_email: '',
    amount: '',
    status: 'pending',
    due_date: '',
    notes: '',
  });

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_email: invoice.client_email || '',
        amount: invoice.amount.toString(),
        status: invoice.status,
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
      });
    } else {
      setEditingInvoice(null);
      const nextNumber = `INV-${Date.now()}`;
      setFormData({
        invoice_number: nextNumber,
        client_name: '',
        client_email: '',
        amount: '',
        status: 'pending',
        due_date: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = invoiceSchema.safeParse({
      ...formData,
      amount: parseFloat(formData.amount),
      client_email: formData.client_email || undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    try {
      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update({
            invoice_number: formData.invoice_number,
            client_name: formData.client_name,
            client_email: formData.client_email || null,
            amount: parseFloat(formData.amount),
            status: formData.status,
            due_date: formData.due_date || null,
            notes: formData.notes || null,
          })
          .eq('id', editingInvoice.id);

        if (error) throw error;
        toast.success('Invoice updated successfully!');
      } else {
        const { error } = await supabase.from('invoices').insert({
          user_id: user!.id,
          invoice_number: formData.invoice_number,
          client_name: formData.client_name,
          client_email: formData.client_email || null,
          amount: parseFloat(formData.amount),
          status: formData.status,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        });

        if (error) throw error;
        toast.success('Invoice created successfully!');
      }

      setDialogOpen(false);
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      toast.success('Invoice deleted successfully!');
      loadInvoices();
    } catch (error: any) {
      toast.error('Failed to delete invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Invoices</h1>
            <p className="text-muted-foreground">Manage your client invoices</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No invoices yet</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <CardDescription>{invoice.client_name}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      {invoice.client_email && (
                        <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
                      )}
                      {invoice.due_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      ${invoice.amount.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice
                  ? 'Update invoice details'
                  : 'Create a new invoice for your client'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_number: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
