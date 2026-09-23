import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { safeToast } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { Loader2, Plus, Copy, CheckCircle, Trash2, FileText } from 'lucide-react';

const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
  'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
  'Manchester', 'Clarendon', 'St. Catherine',
];

const JOB_TYPES = [
  'Regular Lawn Cut + Cleanup',
  'Lawn Cut (Overgrown Grass)',
];

const LAWN_SIZES = [
  'Small (Up to 1/8 acre)',
  'Medium (1/8 - 1/4 acre)',
  'Large (1/4 - 1/2 acre)',
  'Extra Large (1/2 - 1 acre)',
];

interface CustomQuote {
  id: string;
  token: string;
  title: string;
  description: string | null;
  parish: string;
  community: string | null;
  location: string;
  lawn_size: string | null;
  price: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  job_id: string | null;
  created_at: string;
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 12; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

const emptyForm = {
  title: JOB_TYPES[0],
  price: '',
  parish: '',
  community: '',
  location: '',
  lawn_size: '',
  description: '',
  customer_name: '',
  customer_phone: '',
  preferred_date: '',
};

export default function AdminQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      safeToast.error(error);
    } else {
      setQuotes((data || []) as CustomQuote[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createQuote = async () => {
    if (!user) return;
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a price greater than zero');
      return;
    }
    if (!form.parish || !form.location.trim()) {
      toast.error('Parish and address are required');
      return;
    }
    if (!form.preferred_date) {
      toast.error('A preferred date is required');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('custom_quotes').insert([{
      token: generateToken(),
      title: form.title,
      description: form.description.trim() || null,
      parish: form.parish,
      community: form.community.trim() || null,
      location: form.location.trim(),
      lawn_size: form.lawn_size || null,
      price,
      customer_name: form.customer_name.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      preferred_date: form.preferred_date || null,
      created_by: user.id,
    }]);
    setSaving(false);

    if (error) {
      safeToast.error(error);
      return;
    }
    toast.success('Quote created — copy the link and send it to your client');
    setShowDialog(false);
    setForm({ ...emptyForm });
    load();
  };

  const copyLink = (q: CustomQuote) => {
    // Always share the public site link, never a preview/staging address
    const origin = window.location.hostname.endsWith('connectlawn.com')
      ? window.location.origin
      : 'https://connectlawn.com';
    const link = `${origin}/quote/${q.token}`;
    navigator.clipboard.writeText(link);

    setCopiedId(q.id);
    toast.success('Payment link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cancelQuote = async (q: CustomQuote) => {
    const { error } = await supabase
      .from('custom_quotes')
      .update({ status: 'cancelled' })
      .eq('id', q.id);
    if (error) {
      safeToast.error(error);
      return;
    }
    toast.success('Quote cancelled');
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Custom Quotes</h1>
            <p className="text-muted-foreground">
              Set a price on the spot and send your client a payment link
            </p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm }); setShowDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>No quotes yet. Create one while you're with the client.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        {q.customer_name || '—'}
                        {q.customer_phone && (
                          <div className="text-xs text-muted-foreground">{q.customer_phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {q.title}
                        {q.lawn_size && <div className="text-xs text-muted-foreground">{q.lawn_size}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {q.location}
                        <div className="text-xs text-muted-foreground">
                          {q.community ? `${q.community}, ` : ''}{q.parish}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">J${Number(q.price).toLocaleString()}</TableCell>
                      <TableCell>
                        {q.status === 'cancelled' ? (
                          <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>
                        ) : q.status === 'claimed' ? (
                          <Badge variant="secondary">Opened</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">Sent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyLink(q)}>
                          {copiedId === q.id ? (
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Copy
                        </Button>
                      </TableCell>
                      <TableCell>
                        {q.status !== 'cancelled' && !q.job_id && (
                          <Button variant="ghost" size="icon" onClick={() => cancelQuote(q)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Custom Quote</DialogTitle>
              <DialogDescription>
                Enter the price you agreed with the client. They sign in, pay, and the job enters
                the system like any other booking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Price (JMD)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 22000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={form.title} onValueChange={(v) => setForm({ ...form, title: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parish</Label>
                <Select value={form.parish} onValueChange={(v) => setForm({ ...form, parish: v })}>
                  <SelectTrigger><SelectValue placeholder="Select parish" /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    {JAMAICA_PARISHES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Community (optional)</Label>
                <Input
                  placeholder="e.g. Castlewood"
                  value={form.community}
                  onChange={(e) => setForm({ ...form, community: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred date (required — client can change it)</Label>
                <Input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  value={form.preferred_date}
                  onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lawn size (optional)</Label>
                <Select value={form.lawn_size} onValueChange={(v) => setForm({ ...form, lawn_size: v })}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent position="popper">
                    {LAWN_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Client name (optional)</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client phone (optional)</Label>
                  <Input
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes for the provider (optional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Anything the provider should know about this job"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={createQuote} disabled={saving || !form.price || !form.parish || !form.location.trim()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Quote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
