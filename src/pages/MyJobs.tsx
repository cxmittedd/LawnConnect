import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  lawn_size: string | null;
  preferred_date: string | null;
  status: string;
  base_price: number;
  customer_offer: number | null;
  final_price: number | null;
  created_at: string;
}

export default function MyJobs() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('customer');
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
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
            .order('created_at', { ascending: false });

          setPostedJobs(posted || []);
        }

        if (profile.user_role === 'provider' || profile.user_role === 'both') {
          const { data: accepted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('accepted_provider_id', user.id)
            .order('created_at', { ascending: false });

          setAcceptedJobs(accepted || []);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-info text-info-foreground';
      case 'in_negotiation':
        return 'bg-warning text-warning-foreground';
      case 'accepted':
      case 'in_progress':
        return 'bg-primary text-primary-foreground';
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
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

  const JobCard = ({ job }: { job: Job }) => (
    <Card className="hover:shadow-lg transition-shadow">
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
          {job.lawn_size && (
            <Badge variant="secondary">{job.lawn_size}</Badge>
          )}
          {job.preferred_date && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(job.preferred_date), 'MMM dd, yyyy')}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <div className="text-xs text-muted-foreground">
              {job.final_price ? 'Final Price' : 'Offered Price'}
            </div>
            <div className="text-xl font-bold text-primary flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
              J${(job.final_price || job.customer_offer || job.base_price).toFixed(2)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Posted {format(new Date(job.created_at), 'MMM dd')}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Jobs</h1>
          <p className="text-muted-foreground">Manage your job requests and assignments</p>
        </div>

        <Tabs defaultValue={isCustomer ? "posted" : "accepted"} className="w-full">
          {(isCustomer || isProvider) && (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              {isCustomer && <TabsTrigger value="posted">Posted Jobs</TabsTrigger>}
              {isProvider && <TabsTrigger value="accepted">Accepted Jobs</TabsTrigger>}
            </TabsList>
          )}

          {isCustomer && (
            <TabsContent value="posted" className="mt-6">
              {postedJobs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">You haven't posted any jobs yet</p>
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
          )}

          {isProvider && (
            <TabsContent value="accepted" className="mt-6">
              {acceptedJobs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">You haven't accepted any jobs yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {acceptedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </>
  );
}
