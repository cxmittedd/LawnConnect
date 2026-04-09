import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { safeToast } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { Loader2, Tag, Plus, Trash2, Copy, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CouponDiscount {
  id: string;
  customer_id: string;
  discount_percentage: number;
  label: string;
  code: string;
  active: boolean;
  used: boolean;
  used_at: string | null;
  created_at: string;
  customer_name?: string;
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function AdminDiscounts() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CouponDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    email: '',
    percentage: '',
    label: 'Discount',
    code: generateCouponCode(),
  });

  const loadCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      safeToast.error(error);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (d) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', d.customer_id)
          .single();
        return {
          ...d,
          customer_name: profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
        };
      })
    );

    setCoupons(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleAddCoupon = async () => {
    if (!newCoupon.email || !newCoupon.percentage || !user) return;

    const pct = parseInt(newCoupon.percentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    setSaving(true);

    const { data: customerId, error: lookupError } = await supabase.rpc('get_customer_id_by_email', { email_input: newCoupon.email });

    if (lookupError || !customerId) {
      toast.error('Could not find a customer with that email.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('customer_discounts').insert([{
      customer_id: customerId as string,
      discount_percentage: pct,
      label: newCoupon.label || 'Discount',
      code: newCoupon.code,
      created_by: user.id,
    }]);

    if (error) {
      if (error.code === '23505') {
        toast.error('This coupon code already exists. Try generating a new one.');
      } else {
        safeToast.error(error);
      }
      setSaving(false);
      return;
    }

    toast.success('Coupon created successfully');
    setShowAddDialog(false);
    setNewCoupon({ email: '', percentage: '', label: 'Discount', code: generateCouponCode() });
    setSaving(false);
    loadCoupons();
  };

  const deleteCoupon = async (id: string) => {
    const { error } = await supabase.from('customer_discounts').delete().eq('id', id);
    if (error) {
      safeToast.error(error);
      return;
    }
    toast.success('Coupon removed');
    loadCoupons();
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Coupon code copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Discount Coupons</h1>
            <p className="text-muted-foreground">Create and manage coupon codes for specific customers</p>
          </div>
          <Button onClick={() => { setNewCoupon({ email: '', percentage: '', label: 'Discount', code: generateCouponCode() }); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No coupons created yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{c.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyCode(c.id, c.code)}
                          >
                            {copiedId === c.id ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.discount_percentage}%</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.label}</TableCell>
                      <TableCell>
                        {c.used ? (
                          <Badge variant="outline" className="text-muted-foreground">Used</Badge>
                        ) : c.active ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Coupon Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon Code</DialogTitle>
              <DialogDescription>
                Create a one-time use coupon code for a specific customer. They'll enter the code at checkout.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={() => setNewCoupon({ ...newCoupon, code: generateCouponCode() })}>
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Customer Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={newCoupon.email}
                  onChange={(e) => setNewCoupon({ ...newCoupon, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">Discount Percentage</Label>
                <Input
                  id="percentage"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 50"
                  value={newCoupon.percentage}
                  onChange={(e) => setNewCoupon({ ...newCoupon, percentage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Discount Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. Welcome Discount"
                  value={newCoupon.label}
                  onChange={(e) => setNewCoupon({ ...newCoupon, label: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">This label is shown to the customer at checkout</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCoupon} disabled={saving || !newCoupon.email || !newCoupon.percentage || !newCoupon.code}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Coupon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
