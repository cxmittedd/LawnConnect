import { useEffect, useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, CheckCircle, TrendingUp, Calendar, Banknote, Clock, BarChart3 } from 'lucide-react';
import { format, addDays, nextFriday, differenceInDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CompletedJob {
  id: string;
  title: string;
  completed_at: string;
  final_price: number;
  provider_payout: number;
  platform_fee: number;
  payment_status: string;
}

interface Payout {
  id: string;
  amount: number;
  jobs_count: number;
  payout_date: string;
  created_at: string;
}

interface MonthlyEarning {
  month: string;
  earnings: number;
  jobs: number;
}

export default function ProviderEarnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    completedJobsCount: 0,
    averagePerJob: 0,
    pendingPayout: 0,
  });

  // Calculate next payout date (biweekly on Fridays)
  const calculateNextPayoutDate = (lastPayoutDate: Date | null): Date => {
    const today = new Date();
    
    if (lastPayoutDate) {
      // Next payout is 14 days after last payout
      let nextPayout = addDays(lastPayoutDate, 14);
      // If next payout is in the past, find the next upcoming Friday
      while (nextPayout <= today) {
        nextPayout = addDays(nextPayout, 14);
      }
      return nextPayout;
    }
    
    // If no payouts yet, find the next Friday
    const nextFri = nextFriday(today);
    return nextFri;
  };

  const getNextPayoutInfo = () => {
    const lastPayout = payouts.length > 0 ? new Date(payouts[0].payout_date) : null;
    const nextPayoutDate = calculateNextPayoutDate(lastPayout);
    const daysUntil = differenceInDays(nextPayoutDate, new Date());
    
    return {
      date: nextPayoutDate,
      daysUntil: Math.max(0, daysUntil),
    };
  };

  // Calculate monthly earnings for the chart (last 6 months)
  const monthlyEarnings = useMemo((): MonthlyEarning[] => {
    const months: MonthlyEarning[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthJobs = completedJobs.filter(job => {
        if (!job.completed_at) return false;
        const completedDate = new Date(job.completed_at);
        return completedDate >= monthStart && completedDate <= monthEnd;
      });
      
      const earnings = monthJobs.reduce((sum, job) => sum + Number(job.provider_payout || 0), 0);
      
      months.push({
        month: format(monthDate, 'MMM'),
        earnings,
        jobs: monthJobs.length,
      });
    }
    
    return months;
  }, [completedJobs]);
  useEffect(() => {
    if (user) {
      loadEarningsData();
    }
  }, [user]);

  const loadEarningsData = async () => {
    if (!user) return;

    try {
      // Load completed jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('accepted_provider_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Load payout history
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('payout_date', { ascending: false });

      if (payoutsError) {
        console.error('Error loading payouts:', payoutsError);
      } else {
        setPayouts(payoutsData || []);
      }

      if (jobsData) {
        setCompletedJobs(jobsData as CompletedJob[]);

        const totalEarnings = jobsData.reduce((sum, job) => sum + Number(job.provider_payout || 0), 0);
        const completedJobsCount = jobsData.length;
        const averagePerJob = completedJobsCount > 0 ? totalEarnings / completedJobsCount : 0;

        // Calculate this month's earnings
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEarnings = jobsData
          .filter(job => job.completed_at && new Date(job.completed_at) >= firstDayOfMonth)
          .reduce((sum, job) => sum + Number(job.provider_payout || 0), 0);

        // Calculate pending payout (jobs completed but not yet paid out)
        const paidJobIds = payoutsData?.flatMap(p => p.job_ids) || [];
        const pendingPayout = jobsData
          .filter(job => !paidJobIds.includes(job.id))
          .reduce((sum, job) => sum + Number(job.provider_payout || 0), 0);

        setStats({
          totalEarnings,
          thisMonthEarnings,
          completedJobsCount,
          averagePerJob,
          pendingPayout,
        });
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading earnings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Earnings Dashboard</h1>
          <p className="text-muted-foreground">Track your earnings and payment history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">J${stats.totalEarnings.toLocaleString('en-JM', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">J${stats.thisMonthEarnings.toLocaleString('en-JM', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMMM yyyy')}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <CheckCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedJobsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Total jobs finished</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Per Job</CardTitle>
              <TrendingUp className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">J${stats.averagePerJob.toLocaleString('en-JM', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Per completed job</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
              <Clock className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {format(getNextPayoutInfo().date, 'MMM d')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getNextPayoutInfo().daysUntil === 0 
                  ? 'Today!' 
                  : `In ${getNextPayoutInfo().daysUntil} day${getNextPayoutInfo().daysUntil !== 1 ? 's' : ''}`}
              </p>
              {stats.pendingPayout > 0 && (
                <p className="text-xs text-primary font-medium mt-2">
                  J${stats.pendingPayout.toLocaleString('en-JM', { minimumFractionDigits: 2 })} pending
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Earnings Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Monthly Earnings Trend
            </CardTitle>
            <CardDescription>Your earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {completedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No earnings data yet</p>
                <p className="text-sm">Complete jobs to see your earnings trend</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyEarnings}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `J$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'earnings') {
                          return [`J$${value.toLocaleString('en-JM', { minimumFractionDigits: 2 })}`, 'Earnings'];
                        }
                        return [value, 'Jobs'];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#earningsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-success" />
              Payout History
            </CardTitle>
            <CardDescription>Your biweekly payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payouts yet</p>
                <p className="text-sm">Payouts are processed biweekly on Fridays</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout Date</TableHead>
                    <TableHead>Jobs Included</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">
                        {format(new Date(payout.payout_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payout.jobs_count} job{payout.jobs_count !== 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        J${Number(payout.amount).toLocaleString('en-JM', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job History</CardTitle>
            <CardDescription>Your completed jobs and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {completedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed jobs yet</p>
                <p className="text-sm">Complete jobs to see your payment history here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>
                        {job.completed_at ? format(new Date(job.completed_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        J${Number(job.provider_payout || 0).toLocaleString('en-JM', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={job.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {job.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}