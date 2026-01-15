import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Briefcase, Eye, CheckCircle, History, Wrench, XCircle } from 'lucide-react';
import { safeToast } from '@/lib/errorHandler';
import { format, differenceInDays } from 'date-fns';

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  parish: string;
  lawn_size: string | null;
  preferred_date: string | null;
  status: string;
  base_price: number;
  customer_offer: number | null;
  final_price: number | null;
  provider_payout: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function MyJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('customer');
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [completedPostedJobs, setCompletedPostedJobs] = useState<Job[]>([]);
  const [cancelledJobs, setCancelledJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [completedAcceptedJobs, setCompletedAcceptedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;

    try {
      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.user_role);

        if (profile.user_role === 'customer' || profile.user_role === 'both') {
          const { data: posted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('customer_id', user.id)
            .not('status', 'in', '("completed","cancelled")')
            .order('created_at', { ascending: false });

          // Get completed jobs (last 10, not older than 14 days)
          const { data: completedPosted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('customer_id', user.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(10);

          // Get cancelled jobs
          const { data: cancelled } = await supabase
            .from('job_requests')
            .select('*')
            .eq('customer_id', user.id)
            .eq('status', 'cancelled')
            .order('updated_at', { ascending: false })
            .limit(20);

          // Filter out jobs completed more than 14 days ago
          const filteredCompleted = (completedPosted || []).filter(job => {
            if (!job.completed_at) return false;
            return differenceInDays(new Date(), new Date(job.completed_at)) <= 14;
          });

          setPostedJobs(posted || []);
          setCompletedPostedJobs(filteredCompleted);
          setCancelledJobs(cancelled || []);

          // Delete old completed jobs (older than 14 days)
          await cleanupOldCompletedJobs(user.id, 'customer');
        }

        if (profile.user_role === 'provider' || profile.user_role === 'both') {
          // Get active jobs (where provider was accepted, excluding completed)
          const { data: accepted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('accepted_provider_id', user.id)
            .neq('status', 'completed')
            .order('created_at', { ascending: false });

          // Get completed jobs (last 10, not older than 14 days)
          const { data: completedAccepted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('accepted_provider_id', user.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(10);

          // Filter out jobs completed more than 14 days ago
          const filteredCompleted = (completedAccepted || []).filter(job => {
            if (!job.completed_at) return false;
            return differenceInDays(new Date(), new Date(job.completed_at)) <= 14;
          });

          setAcceptedJobs(accepted || []);
          setCompletedAcceptedJobs(filteredCompleted);
        }
      }
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldCompletedJobs = async (userId: string, role: 'customer' | 'provider') => {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      if (role === 'customer') {
        // Get old completed jobs to delete
        const { data: oldJobs } = await supabase
          .from('job_requests')
          .select('id')
          .eq('customer_id', userId)
          .eq('status', 'completed')
          .lt('completed_at', fourteenDaysAgo.toISOString());

        if (oldJobs && oldJobs.length > 0) {
          // Note: We can only delete if we have proper permissions
          // For now, we'll just filter them out in the UI
          console.log(`Found ${oldJobs.length} old completed jobs to clean up`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-info text-info-foreground';
      case 'accepted':
      case 'in_progress':
        return 'bg-primary text-primary-foreground';
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      case 'disputed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'accepted') return 'In Progress';
    if (status === 'disputed') return 'Under Dispute';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        </div>
      </>
    );
  }

  const isCustomer = userRole === 'customer' || userRole === 'both';
  const isProvider = userRole === 'provider' || userRole === 'both';

  const JobCard = ({ job, isProviderView = false }: { job: Job; isProviderView?: boolean }) => {
    return (
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer" 
        onClick={() => navigate(`/job/${job.id}`)}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(job.status)}>
              {getStatusLabel(job.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="gap-1 bg-accent text-accent-foreground">
              <Wrench className="h-3 w-3" />
              {job.title}
            </Badge>
            {job.parish && (
              <Badge variant="outline">{job.parish}</Badge>
            )}
            {job.lawn_size && (
              <Badge variant="secondary">{job.lawn_size}</Badge>
            )}
            {job.preferred_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(job.preferred_date), 'MMM dd, yyyy')}
              </Badge>
            )}
            {job.completed_at && job.status === 'completed' && (
              <Badge variant="outline" className="gap-1 bg-success/10">
                <CheckCircle className="h-3 w-3" />
                Completed {format(new Date(job.completed_at), 'MMM dd, yyyy')}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">
                {isProviderView ? 'Your Earnings' : (job.final_price ? 'Final Price' : 'Job Price')}
              </div>
              <div className="text-xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                J${isProviderView 
                  ? (job.provider_payout || (job.final_price || job.base_price) * 0.70).toFixed(2)
                  : (job.final_price || job.base_price).toFixed(2)}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`); }}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Calculate tab count for grid
  const customerTabCount = isCustomer ? 3 : 0; // Posted + Completed + Cancelled
  const providerTabCount = isProvider ? 2 : 0; // My Jobs + Completed
  const totalTabs = Math.max(customerTabCount, providerTabCount);

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Jobs</h1>
          <p className="text-muted-foreground">Manage your job requests and assignments</p>
        </div>

        <Tabs defaultValue={isCustomer ? "posted" : "accepted"} className="w-full">
          <TabsList className="grid w-full max-w-2xl" style={{ gridTemplateColumns: `repeat(${totalTabs}, 1fr)` }}>
            {isCustomer && (
              <>
                <TabsTrigger value="posted">Posted Jobs</TabsTrigger>
                <TabsTrigger value="posted-completed" className="gap-1">
                  <History className="h-3 w-3" />
                  Completed
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Cancelled
                </TabsTrigger>
              </>
            )}
            {isProvider && !isCustomer && (
              <>
                <TabsTrigger value="accepted" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  My Jobs
                </TabsTrigger>
                <TabsTrigger value="accepted-completed" className="gap-1">
                  <History className="h-3 w-3" />
                  Completed
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isCustomer && (
            <>
              <TabsContent value="posted" className="mt-6">
                {postedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You haven't posted any active jobs</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {postedJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posted-completed" className="mt-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing last 10 completed jobs from the past 14 days
                  </p>
                </div>
                {completedPostedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No completed jobs in the last 14 days</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {completedPostedJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="mt-6">
                {cancelledJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No cancelled jobs</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {cancelledJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}

          {isProvider && !isCustomer && (
            <>
              <TabsContent value="accepted" className="mt-6">
                {acceptedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You don't have any active jobs</p>
                      <Button onClick={() => navigate('/browse-jobs')}>
                        Browse Available Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {acceptedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isProviderView />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="accepted-completed" className="mt-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing last 10 completed jobs from the past 14 days
                  </p>
                </div>
                {completedAcceptedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No completed jobs in the last 14 days</p>
                      <Button onClick={() => navigate('/browse-jobs')}>
                        Browse Available Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {completedAcceptedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isProviderView />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* For users who are both customer and provider, show provider section separately */}
        {isCustomer && isProvider && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Provider Jobs</h2>
            <Tabs defaultValue="accepted" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="accepted" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Active Jobs
                </TabsTrigger>
                <TabsTrigger value="accepted-completed" className="gap-1">
                  <History className="h-3 w-3" />
                  Completed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="accepted" className="mt-6">
                {acceptedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You don't have any active jobs</p>
                      <Button onClick={() => navigate('/browse-jobs')}>
                        Browse Available Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {acceptedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isProviderView />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="accepted-completed" className="mt-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing last 10 completed jobs from the past 14 days
                  </p>
                </div>
                {completedAcceptedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No completed jobs in the last 14 days</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {completedAcceptedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isProviderView />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </>
  );
}