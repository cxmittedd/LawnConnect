import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { safeToast } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { Loader2, Percent, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomerDiscount {
  id: string;
  customer_id: string;
  discount_percentage: number;
  label: string;
  active: boolean;
  created_at: string;
  customer_email?: string;
  customer_name?: string;
}

export default function AdminDiscounts() {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<CustomerDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDiscount, setNewDiscount] = useState({ email: '', percentage: '', label: 'Discount' });

  const loadDiscounts = async () => {
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

    // Fetch profile info for each discount
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

    setDiscounts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const handleAddDiscount = async () => {
    if (!newDiscount.email || !newDiscount.percentage || !user) return;

    const pct = parseInt(newDiscount.percentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    setSaving(true);

    // Look up customer by email via auth - we need to find their profile
    // Since we can't query auth.users, we'll ask admin to use the user ID or find by profile
    const { data: authData } = await supabase.rpc('get_customer_id_by_email', { email_input: newDiscount.email });

    // Fallback: search profiles by matching email isn't possible directly
    // Instead, let's use a simpler approach - search by user ID if email lookup fails
    let customerId = authData;

    if (!customerId) {
      // Try to find in profiles by searching (admin has access to all profiles)
      toast.error('Could not find a customer with that email. Please verify the email address.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('customer_discounts').insert({
      customer_id: customerId,
      discount_percentage: pct,
      label: newDiscount.label || 'Discount',
      created_by: user.id,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('This customer already has a discount. Update or remove the existing one first.');
      } else {
        safeToast.error(error);
      }
      setSaving(false);
      return;
    }

    toast.success('Discount added successfully');
    setShowAddDialog(false);
    setNewDiscount({ email: '', percentage: '', label: 'Discount' });
    setSaving(false);
    loadDiscounts();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('customer_discounts')
      .update({ active: !active })
      .eq('id', id);

    if (error) {
      safeToast.error(error);
      return;
    }
    toast.success(active ? 'Discount deactivated' : 'Discount activated');
    loadDiscounts();
  };

  const deleteDiscount = async (id: string) => {
    const { error } = await supabase.from('customer_discounts').delete().eq('id', id);
    if (error) {
      safeToast.error(error);
      return;
    }
    toast.success('Discount removed');
    loadDiscounts();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Discounts</h1>
            <p className="text-muted-foreground">Manage percentage discounts for specific customer accounts</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : discounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Percent className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No customer discounts configured yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{d.discount_percentage}%</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.label}</TableCell>
                      <TableCell>
                        <Switch
                          checked={d.active}
                          onCheckedChange={() => toggleActive(d.id, d.active)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteDiscount(d.id)}>
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

        {/* Add Discount Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer Discount</DialogTitle>
              <DialogDescription>
                Enter the customer's email and the discount percentage to apply to their account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Customer Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={newDiscount.email}
                  onChange={(e) => setNewDiscount({ ...newDiscount, email: e.target.value })}
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
                  value={newDiscount.percentage}
                  onChange={(e) => setNewDiscount({ ...newDiscount, percentage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Discount Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. Coral Spring Resident Discount"
                  value={newDiscount.label}
                  onChange={(e) => setNewDiscount({ ...newDiscount, label: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddDiscount} disabled={saving || !newDiscount.email || !newDiscount.percentage}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
