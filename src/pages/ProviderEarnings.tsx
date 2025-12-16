import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CompletedJob {
  id: string;
  title: string;
  completed_at: string;
  final_price: number;
  provider_payout: number;
  platform_fee: number;
  payment_status: string;
}

export default function ProviderEarnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    completedJobsCount: 0,
    averagePerJob: 0,
  });

  useEffect(() => {
    if (user) {
      loadEarningsData();
    }
  }, [user]);

  const loadEarningsData = async () => {
    if (!user) return;

    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('accepted_provider_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (jobsError) throw jobsError;

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

        setStats({
          totalEarnings,
          thisMonthEarnings,
          completedJobsCount,
          averagePerJob,
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
        </div>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
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
