import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Share2, Users, Gift, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReferralRow {
  id: string;
  referred_id: string;
  status: string;
  created_at: string;
  qualified_at: string | null;
  referred_name?: string | null;
}

interface CreditRow {
  id: string;
  amount: number;
  source: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export default function Referrals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);

  const shareLink = code ? `https://connectlawn.com/auth?ref=${code}` : '';
  const unusedCredits = credits.filter(c => !c.used);
  const totalUnused = unusedCredits.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalEarned = credits.reduce((sum, c) => sum + Number(c.amount), 0);
  const qualifiedCount = referrals.filter(r => r.status === 'rewarded').length;
  const pendingCount = referrals.filter(r => r.status !== 'rewarded').length;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [codeRes, refRes, credRes] = await Promise.all([
        supabase.from('referral_codes').select('code').eq('user_id', user.id).maybeSingle(),
        supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('referral_credits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      setCode(codeRes.data?.code || null);
      setCredits(credRes.data || []);

      // Fetch first names for each referred user
      const referralsList = refRes.data || [];
      if (referralsList.length > 0) {
        const ids = referralsList.map(r => r.referred_id);
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name')
          .in('id', ids);
        const nameMap = new Map((profs || []).map(p => [p.id, p.first_name]));
        setReferrals(
          referralsList.map(r => ({
            ...r,
            referred_name: nameMap.get(r.referred_id) || 'New user',
          }))
        );
      } else {
        setReferrals([]);
      }
    } catch (err) {
      console.error('Failed to load referrals:', err);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied!');
    } catch {
      toast.error('Could not copy code');
    }
  };

  const shareNative = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({
        title: 'Join LawnConnect',
        text: 'Sign up for LawnConnect using my referral link and get J$1,000 credit on your second job!',
        url: shareLink,
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="min-h-screen bg-page-pattern">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Refer & Earn</h1>
          <p className="text-muted-foreground mt-1">
            Invite friends to LawnConnect. You both get J$1,000 credit when they complete their first job.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available credit</p>
                  <p className="text-2xl font-bold text-primary">J${totalUnused.toLocaleString()}</p>
                </div>
                <Gift className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {unusedCredits.length} credit{unusedCredits.length === 1 ? '' : 's'} ready to use
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total earned</p>
                  <p className="text-2xl font-bold text-foreground">J${totalEarned.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">All-time referral earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Friends referred</p>
                  <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {qualifiedCount} qualified · {pendingCount} pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Share section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your referral link</CardTitle>
            <CardDescription>
              Share this link. When a friend signs up and completes their first job, you both get J$1,000.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : code ? (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={shareLink} className="font-mono text-sm" />
                  <Button onClick={copyLink} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" /> Copy link
                  </Button>
                  <Button onClick={shareNative} className="gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Or share your code:</span>
                  <button
                    onClick={copyCode}
                    className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 font-mono text-sm font-semibold"
                  >
                    {code} <Copy className="h-3 w-3 inline ml-1" />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Referral codes are available for customer accounts only.
              </p>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <div className="font-semibold mb-1">1. Share your link</div>
              <p className="text-muted-foreground">Send your unique link to friends and family.</p>
            </div>
            <div>
              <div className="font-semibold mb-1">2. They sign up &amp; book</div>
              <p className="text-muted-foreground">
                Your friend signs up using your link and books their first lawn job.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">3. You both earn</div>
              <p className="text-muted-foreground">
                When the job is completed, you both get J$1,000 credit toward future jobs.
              </p>
            </div>
            <div className="md:col-span-3 pt-2 text-xs text-muted-foreground">
              Up to 3 credits (J$3,000) can be applied per job. Credits cannot be withdrawn or transferred.
            </div>
          </CardContent>
        </Card>

        {/* Referrals list */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No referrals yet. Share your link to start earning!
              </p>
            ) : (
              <div className="space-y-2">
                {referrals.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border"
                  >
                    <div>
                      <div className="font-medium text-foreground">{r.referred_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {format(new Date(r.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    {r.status === 'rewarded' ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Earned J$1,000
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" /> Pending first job
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit history */}
        <Card>
          <CardHeader>
            <CardTitle>Credit history</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : credits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No credits yet.
              </p>
            ) : (
              <div className="space-y-2">
                {credits.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {c.source === 'welcome_bonus' ? 'Welcome bonus' : 'Referral reward'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), 'MMM d, yyyy')}
                        {c.used && c.used_at && ` · Used ${format(new Date(c.used_at), 'MMM d, yyyy')}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          c.used ? 'text-muted-foreground line-through' : 'text-primary'
                        }`}
                      >
                        +J${Number(c.amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.used ? 'Used' : 'Available'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
