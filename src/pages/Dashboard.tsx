import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Briefcase, DollarSign, CheckCircle, ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('customer');
  const [stats, setStats] = useState({
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    pendingProposals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.user_role);

        if (profile.user_role === 'customer' || profile.user_role === 'both') {
          // Load customer stats
          const { data: jobs } = await supabase
            .from('job_requests')
            .select('*')
            .eq('customer_id', user.id);

          const activeJobs = jobs?.filter(j => ['open', 'in_negotiation', 'accepted', 'in_progress'].includes(j.status)).length || 0;
          const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;

          setStats(prev => ({ ...prev, activeJobs, completedJobs }));
        }

        if (profile.user_role === 'provider' || profile.user_role === 'both') {
          // Load provider stats
          const { data: acceptedJobs } = await supabase
            .from('job_requests')
            .select('*')
            .eq('accepted_provider_id', user.id);

          const totalEarnings = acceptedJobs?.filter(j => j.status === 'completed')
            .reduce((sum, job) => sum + Number(job.provider_payout || 0), 0) || 0;

          const { data: proposals } = await supabase
            .from('job_proposals')
            .select('*')
            .eq('provider_id', user.id)
            .eq('status', 'pending');

          setStats(prev => ({ 
            ...prev, 
            totalEarnings, 
            pendingProposals: proposals?.length || 0 
          }));
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  const isCustomer = userRole === 'customer' || userRole === 'both';
  const isProvider = userRole === 'provider' || userRole === 'both';

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {isCustomer && 'Welcome back! Manage your lawn care requests.'}
            {isProvider && !isCustomer && 'Welcome back! Find new lawn cutting jobs.'}
          </p>
        </div>

        {isCustomer && (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Briefcase className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">In progress or open</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Plus className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/post-job')} className="w-full" size="sm">
                    Post New Job
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Quick Actions</CardTitle>
                <CardDescription>Manage your lawn care needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/post-job')} variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Post a New Job Request
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button onClick={() => navigate('/my-jobs')} variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    View My Job Requests
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {isProvider && (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-8 mt-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">J${stats.totalEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From completed jobs</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Proposals</CardTitle>
                  <Scissors className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingProposals}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting customer response</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Find Work</CardTitle>
                  <Briefcase className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/browse-jobs')} className="w-full" size="sm">
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Provider Quick Actions</CardTitle>
                <CardDescription>Find and manage your lawn cutting jobs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/browse-jobs')} variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Scissors className="h-4 w-4" />
                    Browse Available Jobs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button onClick={() => navigate('/my-jobs')} variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    View My Accepted Jobs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
