import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CalendarClock, Trash2, CreditCard } from 'lucide-react';

const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
  'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
  'Manchester', 'Clarendon', 'St. Catherine',
];

const JOB_TYPES = [
  { value: 'Regular Lawn Cut + Cleanup', label: 'Lawn Cut + Cleanup' },
  { value: 'Lawn Cut (Overgrown Grass)', label: 'Lawn Cut (Overgrown Grass) (+$1,500)' },
];

const LAWN_SIZES = [
  { label: 'Small (Up to 1/8 acre)', price: 7000 },
  { label: 'Medium (1/8 - 1/4 acre)', price: 13000 },
  { label: 'Large (1/4 - 1/2 acre)', price: 18500 },
  { label: 'Extra Large (1/2 - 1 acre)', price: 35000 },
];

const TIMES = ['Morning (8am - 12pm)', 'Afternoon (12pm - 4pm)', 'Evening (4pm - 6pm)'];

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  parish: string;
  location: string;
  lawn_size: string | null;
  preferred_time: string | null;
  day_of_month: number;
  active: boolean;
  next_run_date: string;
  last_run_date: string | null;
}

const emptyForm = {
  title: JOB_TYPES[0].value,
  description: '',
  parish: '',
  location: '',
  lawn_size: '',
  preferred_time: TIMES[0],
  day_of_month: '1',
};

export default function Autopay() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data, error } = await supabase
      .from('autopay_schedules')
      .select('id, title, description, parish, location, lawn_size, preferred_time, day_of_month, active, next_run_date, last_run_date')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load your repeat bookings');
    } else {
      setSchedules(data as Schedule[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const estimated = LAWN_SIZES.find((s) => s.label === form.lawn_size)?.price;
  const extra = form.title === 'Lawn Cut (Overgrown Grass)' ? 1500 : 0;

  const nextDate = (day: number) => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, 28)));
    if (d <= now) d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  };

  const handleCreate = async () => {
    if (!form.parish || !form.location.trim() || !form.lawn_size) {
      toast.error('Please fill in parish, address and lawn size');
      return;
    }
    if (!consent) {
      toast.error('Please agree to the monthly booking terms');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('autopay_schedules').insert({
      customer_id: user!.id,
      title: form.title,
      description: form.description.trim() || null,
      parish: form.parish,
      location: form.location.trim(),
      lawn_size: form.lawn_size,
      preferred_time: form.preferred_time,
      day_of_month: Number(form.day_of_month),
      frequency: 'monthly',
      next_run_date: nextDate(Number(form.day_of_month)),
    });
    setSaving(false);
    if (error) {
      toast.error('Could not save your repeat booking');
      return;
    }
    toast.success('Monthly booking set up');
    setForm(emptyForm);
    setConsent(false);
    load();
  };

  const toggleActive = async (s: Schedule) => {
    const { error } = await supabase
      .from('autopay_schedules')
      .update({ active: !s.active })
      .eq('id', s.id);
    if (error) return toast.error('Could not update');
    toast.success(!s.active ? 'Autopay resumed' : 'Autopay paused');
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('autopay_schedules').delete().eq('id', id);
    if (error) return toast.error('Could not remove');
    toast.success('Repeat booking removed');
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Autopay Monthly Lawn Care | LawnConnect"
        description="Set up a monthly repeat lawn booking with LawnConnect and never think about your lawn again."
      />
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="h-7 w-7 text-primary" />
            Autopay
          </h1>
          <p className="text-muted-foreground mt-2">
            Book your lawn once and we'll repeat it every month automatically.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Set up a monthly booking</CardTitle>
            <CardDescription>Pick your lawn details and the day of each month you want service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={form.title} onValueChange={(v) => setForm({ ...form, title: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Parish</Label>
                <Select value={form.parish} onValueChange={(v) => setForm({ ...form, parish: v })}>
                  <SelectTrigger><SelectValue placeholder="Select parish" /></SelectTrigger>
                  <SelectContent>
                    {JAMAICA_PARISHES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lawn size</Label>
                <Select value={form.lawn_size} onValueChange={(v) => setForm({ ...form, lawn_size: v })}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {LAWN_SIZES.map((s) => (
                      <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Street address, community"
                maxLength={300}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferred time</Label>
                <Select value={form.preferred_time} onValueChange={(v) => setForm({ ...form, preferred_time: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Day of each month</Label>
                <Select value={form.day_of_month} onValueChange={(v) => setForm({ ...form, day_of_month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes for the provider (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={1000}
                rows={3}
              />
            </div>

            {estimated && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Estimated monthly total</p>
                <p className="text-2xl font-bold">J${(estimated + extra).toLocaleString('en-JM')}</p>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
              <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
                I agree that LawnConnect may create this booking for me every month and charge my saved card
                once card payments are active. Until then I'll get a secure payment link by email each month.
                I can pause or cancel any time.
              </Label>
            </div>

            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Turn on monthly autopay'}
            </Button>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold mb-4">Your repeat bookings</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You don't have any monthly bookings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {schedules.map((s) => (
              <Card key={s.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.lawn_size} · {s.parish}</p>
                      <p className="text-sm text-muted-foreground">{s.location}</p>
                    </div>
                    <Badge variant={s.active ? 'default' : 'secondary'}>
                      {s.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Next booking: {new Date(s.next_run_date).toLocaleDateString('en-JM', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                      <span className="text-sm">{s.active ? 'Autopay on' : 'Autopay off'}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8 border-dashed">
          <CardContent className="p-5 flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Saved-card charging switches on as soon as recurring card payments are enabled on your
              payment account. Your monthly bookings keep running in the meantime with an emailed payment link.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
