import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Ticket, CalendarClock, Trophy, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { GIVEAWAY, isGiveawayLive, isGiveawayVisible } from '@/lib/giveaway';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const COMMUNITY_VALUE = 'coral_spring';

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

const diff = (target: Date, now: Date): Countdown => {
  const ms = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
};

export function DashboardGiveawayCard({ isCustomer }: { isCustomer: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [entries, setEntries] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user || !isCustomer) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('job_requests')
        .select('id, created_at, community, payment_status')
        .eq('customer_id', user.id)
        .eq('payment_status', 'paid')
        .eq('community', COMMUNITY_VALUE)
        .gte('created_at', GIVEAWAY.startDate.toISOString())
        .lte('created_at', GIVEAWAY.endDate.toISOString());
      if (!cancelled) setEntries(data?.length ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isCustomer]);

  const live = isGiveawayLive(now);
  const ended = now > GIVEAWAY.endDate;
  const target = live ? GIVEAWAY.endDate : ended ? GIVEAWAY.drawDate : GIVEAWAY.startDate;
  const cd = diff(target, now);

  const progress = useMemo(() => {
    const total = GIVEAWAY.endDate.getTime() - GIVEAWAY.startDate.getTime();
    const done = now.getTime() - GIVEAWAY.startDate.getTime();
    return Math.min(100, Math.max(0, (done / total) * 100));
  }, [now]);

  if (!isGiveawayVisible(now)) return null;

  const label = live ? 'Entries close in' : ended ? 'Winner drawn in' : 'Giveaway starts in';

  return (
    <Card className="relative mt-8 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 transition-all duration-300 hover:shadow-xl animate-fade-in">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform duration-300 hover:scale-110 hover:rotate-6">
            <Gift className="h-5 w-5" />
          </span>
          <CardTitle className="text-xl">{GIVEAWAY.prize} Giveaway</CardTitle>
          <Badge variant={live ? 'default' : 'secondary'} className="ml-auto">
            {live ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> Live now
              </span>
            ) : ended ? (
              'Entries closed'
            ) : (
              'Coming soon'
            )}
          </Badge>
        </div>
        <CardDescription>
          Book any lawn care job in {GIVEAWAY.community} during September 2026 for a chance to win. Select{' '}
          <strong>Coral Springs</strong> under Communities when posting the job.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> {label}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:max-w-md">
            {[
              ['Days', cd.days],
              ['Hrs', cd.hours],
              ['Min', cd.minutes],
              ['Sec', cd.seconds],
            ].map(([l, v]) => (
              <div
                key={l as string}
                className="rounded-lg border bg-card/70 py-2 text-center transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-xl font-bold tabular-nums">{String(v).padStart(2, '0')}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Sept 1</span>
            <span>Sept 30</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isCustomer && (
          <div className="flex items-center gap-3 rounded-lg border bg-card/70 p-3">
            <Ticket className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {entries === null ? 'Checking your entries…' : `${entries} ${entries === 1 ? 'entry' : 'entries'}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {entries && entries > 0
                  ? 'You’re in the draw. Every extra booking in Coral Springs adds another entry.'
                  : 'Select Coral Springs under Communities when posting. Each paid booking there earns one entry.'}
              </p>
            </div>
            {entries !== null && entries > 0 && <Sparkles className="h-5 w-5 animate-pulse text-primary" />}
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> How it works
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <ol className="animate-fade-in space-y-2 pl-1 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span> Book and pay for a lawn care job in{' '}
              {GIVEAWAY.community} between September 1 and 30, 2026. Select <strong>Coral Springs</strong> under
              Communities when posting.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span> Each paid booking counts as one entry — more
              bookings, better odds.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span> One winner is drawn at random on October 1, 2026
              and contacted by email.
            </li>
          </ol>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {isCustomer && (
            <Button onClick={() => navigate('/post-job')} className="flex-1 transition-transform active:scale-[0.98]">
              {live ? 'Book now to enter' : 'Book a job'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/giveaway')} className="flex-1">
            View full rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
