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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerPreferences } from '@/hooks/useCustomerPreferences';
import { toast } from 'sonner';
import { RefreshCw, CalendarClock, Trash2, CreditCard, Wand2, X, ArrowRight, Loader2 } from 'lucide-react';

const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
  'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
  'Manchester', 'Clarendon', 'St. Catherine',
] as const;

const JOB_TYPES = [
  { value: 'Regular Lawn Cut + Cleanup', label: 'Lawn Cut + Cleanup', extraCost: 0 },
  { value: 'Lawn Cut (Overgrown Grass)', label: 'Lawn Cut (Overgrown Grass) (+$1,500)', extraCost: 1500 },
] as const;

const LAWN_SIZES = [
  { value: 'small', label: 'Small (Up to 1/8 acre)', description: 'Typical scheme house yard', minOffer: 7000 },
  { value: 'medium', label: 'Medium (1/8 - 1/4 acre)', description: 'Larger residential yard', minOffer: 13000 },
  { value: 'large', label: 'Large (1/4 - 1/2 acre)', description: 'Spacious property', minOffer: 18500 },
  { value: 'xlarge', label: 'Extra Large (1/2 - 1 acre)', description: 'Estate-sized lawn', minOffer: 35000 },
] as const;

const COMMUNITIES: { value: string; label: string }[] = [
  { value: 'coral_spring', label: 'Coral Springs Village' },
  { value: 'florence_hall', label: 'Florence Hall' },
  { value: 'stonebrook_vista', label: 'Stonebrook Vista' },
  { value: 'stonebrook_manor', label: 'Stonebrook Manor' },
  { value: 'treasure_bay_estates', label: 'Treasure Bay Estates' },
  { value: 'phoenix_park_village', label: 'Phoenix Park Village' },
  { value: 'castlewood', label: 'Castlewood' },
  { value: 'holland_estate', label: 'Holland Estate' },
];

const communityLabel = (value: string) => COMMUNITIES.find(c => c.value === value)?.label || value;

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
  ezeepay_status: string | null;
  ezeepay_subscription_id: string | null;
}

const emptyForm = {
  title: '',
  description: '',
  location: '',
  parish: '',
  lawn_size: '',
  preferred_time: '',
  day_of_month: '1',
};

export default function Autopay() {
  const { user } = useAuth();
  const { preferences } = useCustomerPreferences();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [lawnSizeSelection, setLawnSizeSelection] = useState('');
  const [community, setCommunity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [phase, setPhase] = useState('');
  const [showAutofillPreview, setShowAutofillPreview] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('autopay_schedules')
      .select('id, title, description, parish, location, lawn_size, preferred_time, day_of_month, active, next_run_date, last_run_date, ezeepay_status, ezeepay_subscription_id')
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

  // Handle return from EzeePay card-setup checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupStatus = params.get('setup');
    if (setupStatus === 'complete') {
      toast.success('Card setup submitted! Your subscription is being verified.');
      window.history.replaceState({}, '', '/autopay');
      load();
    } else if (setupStatus === 'cancelled') {
      toast.error('Card setup was cancelled. Your booking was not activated.');
      window.history.replaceState({}, '', '/autopay');
      load();
    }
  }, []);

  const currentMinOffer = LAWN_SIZES.find(s => s.value === lawnSizeSelection)?.minOffer || 0;
  const extra = JOB_TYPES.find(t => t.value === form.title)?.extraCost || 0;
  const estimated = currentMinOffer ? currentMinOffer + extra : 0;

  const hasPreferences = Boolean(
    preferences && (preferences.location || preferences.parish || preferences.lawn_size || preferences.job_type)
  );

  const getPreviewItems = () => {
    if (!preferences) return [];
    const items: { label: string; value: string }[] = [];
    if (preferences.job_type) items.push({ label: 'Job Type', value: preferences.job_type });
    if (preferences.parish) items.push({ label: 'Parish', value: preferences.parish });
    if (preferences.location) items.push({ label: 'Location', value: preferences.location });
    if (preferences.lawn_size) items.push({ label: 'Lawn Size', value: preferences.lawn_size });
    return items;
  };

  const applyAutofill = () => {
    if (!preferences) return;

    const lawnSizeValue = LAWN_SIZES.find(s => s.label === preferences.lawn_size)?.value || '';
    setLawnSizeSelection(lawnSizeValue);

    let resolvedLocation = preferences.location || '';
    let resolvedParish = preferences.parish || '';
    let matchedCommunity = '';
    let matchedPhase = '';
    let matchedLot = '';

    const communityMatch = (preferences.location || '').match(/^(.+?),\s*(Phase\s*[123]),\s*Lot\s*(\d+)\s*$/i);
    if (communityMatch) {
      const [, label, phaseStr, lot] = communityMatch;
      const commValue = COMMUNITIES.find(c => c.label === label.trim())?.value;
      if (commValue) {
        matchedCommunity = commValue;
        matchedPhase = `Phase ${phaseStr.trim().slice(-1)}`;
        matchedLot = lot;
        resolvedLocation = '';
        resolvedParish = 'Trelawny';
      }
    }

    setCommunity(matchedCommunity);
    setPhase(matchedPhase);
    setLotNumber(matchedLot);
    setForm(prev => ({
      ...prev,
      title: preferences.job_type || prev.title,
      parish: resolvedParish || prev.parish,
      location: resolvedLocation || prev.location,
      lawn_size: preferences.lawn_size || prev.lawn_size,
    }));
    setShowAutofillPreview(false);
    toast.success('Previous job details loaded');
  };

  const clearForm = () => {
    setForm(emptyForm);
    setLawnSizeSelection('');
    setCommunity('');
    setLotNumber('');
    setPhase('');
    toast.success('Form cleared');
  };

  const handleLawnSizeChange = (value: string) => {
    setLawnSizeSelection(value);
    const selected = LAWN_SIZES.find(s => s.value === value);
    setForm({ ...form, lawn_size: selected?.label || '' });
  };

  const nextDate = (day: number) => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, 28)));
    if (d <= now) d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  };

  const isCommunityJob = community !== '' && community !== 'none';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title) return toast.error('Please select a job type');
    if (!form.parish) return toast.error('Please select a parish');
    if (isCommunityJob) {
      if (!lotNumber.trim()) return toast.error('Please enter a lot number');
      if (!phase) return toast.error('Please select a phase');
    } else if (!form.location.trim()) {
      return toast.error('Please enter a location');
    }
    if (!lawnSizeSelection) return toast.error('Please select a lawn size');
    if (!consent) return toast.error('Please agree to the monthly booking terms');

    const jobLocation = isCommunityJob
      ? `${communityLabel(community)}, ${phase}, Lot ${lotNumber.trim()}`
      : form.location.trim();

    setSaving(true);

    // Block duplicate autopay for the same address
    const { data: existing } = await supabase
      .from('autopay_schedules')
      .select('id, location, parish')
      .eq('customer_id', user!.id)
      .eq('active', true);
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const duplicate = (existing || []).find(
      (s) => normalize(s.location) === normalize(jobLocation)
    );
    if (duplicate) {
      setSaving(false);
      toast.error('You already have autopay set up for this address. Pause or remove the existing one first.');
      return;
    }

    // 1. Create the schedule in the database
    const { data: schedule, error: insertError } = await supabase
      .from('autopay_schedules')
      .insert({
        customer_id: user!.id,
        title: form.title,
        description: form.description.trim() || null,
        parish: form.parish,
        community: isCommunityJob ? community : null,
        location: jobLocation,
        lawn_size: form.lawn_size,
        preferred_time: form.preferred_time.trim() || null,
        day_of_month: Number(form.day_of_month),
        frequency: 'monthly',
        next_run_date: nextDate(Number(form.day_of_month)),
      })
      .select('id')
      .single();

    if (insertError || !schedule) {
      setSaving(false);
      toast.error('Could not save your repeat booking');
      return;
    }

    // 2. Create EzeePay subscription + get checkout token
    const { data: subResult, error: subError } = await supabase.functions.invoke('ezeepay-create-subscription', {
      body: {
        schedule_id: schedule.id,
        amount: estimated,
        customer_email: user!.email,
        customer_name: '',
        description: `${form.title} - ${jobLocation}`,
        origin_url: window.location.origin,
      },
    });

    if (subError || !subResult?.success) {
      // Clean up the schedule if subscription creation failed
      await supabase.from('autopay_schedules').delete().eq('id', schedule.id);
      setSaving(false);
      let message = subResult?.error as string | undefined;
      if (!message && subError) {
        try {
          const ctx = (subError as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            message = body?.error;
          }
        } catch { /* ignore */ }
      }
      if (message && /licence not found/i.test(message)) {
        message = 'Autopay is not available yet — the payment provider has not activated recurring billing for this account.';
      }
      toast.error(message || 'Could not set up recurring payment. Please try again later.');
      return;
    }


    // 3. Redirect to EzeePay's hosted checkout via a hidden form POST
    const payForm = document.createElement('form');
    payForm.method = 'POST';
    payForm.action = subResult.checkout_url;
    Object.entries(subResult.payment_data).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      payForm.appendChild(input);
    });
    document.body.appendChild(payForm);
    payForm.submit();
  };

  const toggleActive = async (s: Schedule) => {
    if (s.ezeepay_subscription_id && s.ezeepay_status === 'active' && s.active) {
      // Cancelling an active EzeePay-managed subscription
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('ezeepay-cancel-subscription', {
        body: { schedule_id: s.id },
      });
      setSaving(false);
      if (error || !data?.success) {
        toast.error('Could not cancel subscription');
        return;
      }
      toast.success('Autopay cancelled — no further charges will be made');
      load();
    } else if (!s.active && s.ezeepay_subscription_id) {
      // Can't resume a cancelled EzeePay subscription
      toast.info('Please create a new autopay booking to resume service');
      return;
    } else {
      // Non-EzeePay schedule — simple toggle
      const { error } = await supabase
        .from('autopay_schedules')
        .update({ active: !s.active })
        .eq('id', s.id);
      if (error) return toast.error('Could not update');
      toast.success(!s.active ? 'Autopay resumed' : 'Autopay paused');
      load();
    }
  };

  const remove = async (s: Schedule) => {
    setSaving(true);
    // Cancel EzeePay subscription if active
    if (s.ezeepay_subscription_id && s.ezeepay_status === 'active') {
      await supabase.functions.invoke('ezeepay-cancel-subscription', {
        body: { schedule_id: s.id },
      });
    }
    const { error } = await supabase.from('autopay_schedules').delete().eq('id', s.id);
    setSaving(false);
    if (error) return toast.error('Could not remove');
    toast.success('Repeat booking removed');
    load();
  };

  return (
    <>
      <SEO
        title="Autopay Monthly Lawn Care | LawnConnect"
        description="Set up a monthly repeat lawn booking with LawnConnect and never think about your lawn again."
        path="/autopay"
      />
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <RefreshCw className="h-7 w-7 text-primary" />
              Autopay
            </h1>
            <p className="text-muted-foreground">Book your lawn once and we'll repeat it every month</p>
          </div>

          <form onSubmit={handleCreate}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Job Details</CardTitle>
                    <CardDescription>Same details as a normal booking, repeated monthly.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearForm}
                      className="gap-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                    {hasPreferences && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAutofillPreview(true)}
                        className="gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        Autofill
                      </Button>
                    )}
                  </div>

                  <Dialog open={showAutofillPreview} onOpenChange={setShowAutofillPreview}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Autofill from Previous Job</DialogTitle>
                        <DialogDescription>
                          The following details will be filled in from your last booking:
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        {getPreviewItems().map((item, index) => (
                          <div key={index} className="flex flex-col gap-1 rounded-lg border p-3">
                            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                            <span className="text-sm">{item.value}</span>
                          </div>
                        ))}
                        {getPreviewItems().length === 0 && (
                          <p className="text-sm text-muted-foreground">No saved details found.</p>
                        )}
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setShowAutofillPreview(false)}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={applyAutofill} disabled={getPreviewItems().length === 0}>
                          Apply
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Type *</Label>
                  <Select value={form.title} onValueChange={(value) => setForm({ ...form, title: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[260px]">
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Community</Label>
                  <Select
                    value={community}
                    onValueChange={(value) => {
                      setCommunity(value);
                      if (value !== 'none' && value !== '') {
                        setForm(prev => ({ ...prev, parish: 'Trelawny' }));
                      } else {
                        setLotNumber('');
                        setPhase('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select community (optional)" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[260px]">
                      <SelectItem value="none">None</SelectItem>
                      {COMMUNITIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parish">Parish *</Label>
                    <Select
                      value={form.parish}
                      onValueChange={(value) => setForm({ ...form, parish: value })}
                      disabled={isCommunityJob}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parish" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[260px]">
                        {JAMAICA_PARISHES.map((parish) => (
                          <SelectItem key={parish} value={parish}>{parish}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isCommunityJob ? (
                    <div className="space-y-2">
                      <Label htmlFor="lot_number">Lot Number *</Label>
                      <Input
                        id="lot_number"
                        type="number"
                        placeholder="Enter lot number"
                        value={lotNumber}
                        onChange={(e) => setLotNumber(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="Street address or neighborhood"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        maxLength={300}
                      />
                    </div>
                  )}
                </div>

                {isCommunityJob && (
                  <div className="space-y-2">
                    <Label>Phase *</Label>
                    <Select value={phase} onValueChange={setPhase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[260px]">
                        <SelectItem value="Phase 1">Phase 1</SelectItem>
                        <SelectItem value="Phase 2">Phase 2</SelectItem>
                        <SelectItem value="Phase 3">Phase 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lawn_size">Lawn Size *</Label>
                    <Select value={lawnSizeSelection} onValueChange={handleLawnSizeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lawn size" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[260px]">
                        {LAWN_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            <div className="flex flex-col">
                              <span>{size.label}</span>
                              <span className="text-xs text-muted-foreground">{size.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day_of_month">Day of Each Month *</Label>
                    <Select value={form.day_of_month} onValueChange={(v) => setForm({ ...form, day_of_month: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[260px]">
                        {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      We create your booking on this day every month. Providers have 3 days to complete it.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_time">Preferred Time</Label>
                    <Input
                      id="preferred_time"
                      placeholder="e.g., Morning, Afternoon"
                      value={form.preferred_time}
                      onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about the job..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={1000}
                    rows={3}
                  />
                </div>

                {estimated > 0 && (
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Estimated monthly total</p>
                    <p className="text-2xl font-bold">J${estimated.toLocaleString('en-JM')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your card is charged this amount each month. You'll be redirected to our payment
                      partner to securely authorize recurring billing.
                    </p>
                  </div>
                )}

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/50">
                  <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
                  <Label htmlFor="consent" className="text-sm font-normal leading-relaxed cursor-pointer">
                    I agree to be charged the above amount each month for my lawn service. I authorise
                    LawnConnect to charge my card via our payment partner until I cancel. I can cancel
                    any time from this page.
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <span>Turn on monthly autopay</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>

          <h2 className="text-xl font-semibold mt-8 mb-4">Your repeat bookings</h2>
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
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={s.active ? 'default' : 'secondary'}>
                          {s.active ? 'Active' : 'Paused'}
                        </Badge>
                        {s.ezeepay_subscription_id && (
                          <Badge variant="outline" className="text-xs">
                            {s.ezeepay_status === 'active' ? 'Card on file' : s.ezeepay_status === 'pending' ? 'Verifying card...' : 'No card'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      {s.ezeepay_status === 'pending' && s.ezeepay_subscription_id
                        ? 'Card verification in progress'
                        : `Next booking: ${new Date(s.next_run_date).toLocaleDateString('en-JM', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.active}
                          onCheckedChange={() => toggleActive(s)}
                          disabled={saving}
                        />
                        <span className="text-sm">{s.active ? 'Autopay on' : 'Autopay off'}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => remove(s)} disabled={saving}>
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
                When you turn on autopay, you'll be redirected to our payment partner's secure page
                to enter your card and verify it with a small test charge. Your card is then charged
                automatically each month and a new booking is created for you — no action needed.
                Cancel any time from this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
