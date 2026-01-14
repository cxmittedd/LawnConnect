import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Briefcase, DollarSign, CheckCircle, ArrowRight, Plus, Calendar, CreditCard, Pause, MapPin, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InstallBanner from '@/components/InstallBanner';
import { useCustomerPreferences, AutopaySettings } from '@/hooks/useCustomerPreferences';
import { EditAutopayDialog } from '@/components/EditAutopayDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

const getDaySuffix = (day: number) => {
  if (day === 1 || day === 21) return 'st';
  if (day === 2 || day === 22) return 'nd';
  if (day === 3 || day === 23) return 'rd';
  return 'th';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { autopaySettings, disableAutopay, deleteAutopay, updateAutopaySettings } = useCustomerPreferences();
  const [userRole, setUserRole] = useState<string>('customer');
  const [editingAutopay, setEditingAutopay] = useState<AutopaySettings | null>(null);
  const [stats, setStats] = useState({
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    myActiveJobs: 0,
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
          // Load customer stats - only count paid jobs
          const { data: jobs } = await supabase
            .from('job_requests')
            .select('*')
            .eq('customer_id', user.id)
            .eq('payment_status', 'paid');

          const activeJobs = jobs?.filter(j => ['open', 'accepted', 'in_progress'].includes(j.status)).length || 0;
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

          const myActiveJobs = acceptedJobs?.filter(j => 
            ['accepted', 'in_progress', 'pending_completion'].includes(j.status)
          ).length || 0;

          setStats(prev => ({ 
            ...prev, 
            totalEarnings, 
            myActiveJobs
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
    <div className="min-h-screen bg-page-gradient">
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
                  <div className="flex flex-col items-center gap-1">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Jobs</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">In progress or open</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-[10px] text-muted-foreground">Done</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <div className="flex flex-col items-center gap-1">
                    <Plus className="h-5 w-5 text-accent" />
                    <span className="text-[10px] text-muted-foreground">New</span>
                  </div>
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

            {/* Autopay Status Card */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Autopay Schedules</CardTitle>
                  </div>
                  {autopaySettings.filter(s => s.enabled).length > 0 && (
                    <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                      {autopaySettings.filter(s => s.enabled).length} Active
                    </span>
                  )}
                </div>
                <CardDescription>
                  {autopaySettings.filter(s => s.enabled).length > 0
                    ? 'Your lawn care is scheduled automatically'
                    : 'Set up recurring lawn care jobs'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {autopaySettings.filter(s => s.enabled).length > 0 ? (
                  <div className="space-y-4">
                    {autopaySettings.filter(s => s.enabled).map((setting) => (
                      <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {setting.location_name || setting.parish}
                          </h4>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {setting.frequency === 'bimonthly' ? 'Twice/month' : 'Monthly'}
                          </span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-4 w-4" />
                            <span>Card ending in {setting.card_last_four}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cut day{setting.frequency === 'bimonthly' ? 's' : ''}:</span>
                            <span className="font-medium">
                              {setting.recurring_day}{getDaySuffix(setting.recurring_day)}
                              {setting.frequency === 'bimonthly' && setting.recurring_day_2 && (
                                <> & {setting.recurring_day_2}{getDaySuffix(setting.recurring_day_2)}</>
                              )}
                            </span>
                          </div>
                          {setting.next_scheduled_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Next cut:</span>
                              <span className="font-medium">{format(new Date(setting.next_scheduled_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => setEditingAutopay(setting)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await disableAutopay(setting.id!);
                                toast.success('Autopay disabled');
                              } catch {
                                toast.error('Failed to disable autopay');
                              }
                            }}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Disable
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await deleteAutopay(setting.id!);
                                toast.success('Autopay deleted');
                              } catch {
                                toast.error('Failed to delete autopay');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => navigate('/post-job')} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Location
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Autopay posts jobs automatically 2 days before your selected cut date each month.
                    </p>
                    <Button onClick={() => navigate('/post-job')} variant="outline">
                      Set Up During Next Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {isProvider && (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-8 mt-8">
              <Card 
                className="hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/earnings')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <div className="flex flex-col items-center gap-1">
                    <DollarSign className="h-5 w-5 text-success" />
                    <span className="text-[10px] text-muted-foreground">Earnings</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">J${stats.totalEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From completed jobs</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/my-jobs')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Active Jobs</CardTitle>
                  <div className="flex flex-col items-center gap-1">
                    <Briefcase className="h-5 w-5 text-warning" />
                    <span className="text-[10px] text-muted-foreground">Active</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.myActiveJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">Jobs in progress</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Find Work</CardTitle>
                  <div className="flex flex-col items-center gap-1">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Browse</span>
                  </div>
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
                <Button onClick={() => navigate('/earnings')} variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    View Earnings Dashboard
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <InstallBanner />
      
      {/* Edit Autopay Dialog */}
      {editingAutopay && (
        <EditAutopayDialog
          open={!!editingAutopay}
          onOpenChange={(open) => !open && setEditingAutopay(null)}
          settings={editingAutopay}
          onSave={updateAutopaySettings}
        />
      )}
    </div>
  );
}
