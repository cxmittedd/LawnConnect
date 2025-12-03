import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Briefcase, Eye, MessageSquare, Send, CheckCircle } from 'lucide-react';
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

interface ProposalWithJob {
  id: string;
  proposed_price: number;
  status: string;
  created_at: string;
  job: Job;
}

interface ProposalCount {
  job_id: string;
  count: number;
}

export default function MyJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('customer');
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [pendingProposals, setPendingProposals] = useState<ProposalWithJob[]>([]);
  const [proposalCounts, setProposalCounts] = useState<Map<string, number>>(new Map());
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

          // Get proposal counts for customer's jobs
          if (posted && posted.length > 0) {
            const jobIds = posted.map(j => j.id);
            const { data: proposals } = await supabase
              .from('job_proposals')
              .select('job_id')
              .in('job_id', jobIds)
              .eq('status', 'pending');

            if (proposals) {
              const counts = new Map<string, number>();
              proposals.forEach(p => {
                counts.set(p.job_id, (counts.get(p.job_id) || 0) + 1);
              });
              setProposalCounts(counts);
            }
          }
        }

        if (profile.user_role === 'provider' || profile.user_role === 'both') {
          // Get accepted jobs (where provider was accepted)
          const { data: accepted } = await supabase
            .from('job_requests')
            .select('*')
            .eq('accepted_provider_id', user.id)
            .order('created_at', { ascending: false });

          setAcceptedJobs(accepted || []);

          // Get pending proposals (proposals submitted but not yet accepted)
          const { data: proposals } = await supabase
            .from('job_proposals')
            .select('id, proposed_price, status, created_at, job_id')
            .eq('provider_id', user.id)
            .eq('status', 'pending');

          if (proposals && proposals.length > 0) {
            // Fetch job details for each pending proposal
            const jobIds = proposals.map(p => p.job_id);
            const { data: jobs } = await supabase
              .from('job_requests')
              .select('*')
              .in('id', jobIds)
              .in('status', ['open', 'in_negotiation']);

            if (jobs) {
              const jobMap = new Map(jobs.map(j => [j.id, j]));
              const proposalsWithJobs: ProposalWithJob[] = proposals
                .filter(p => jobMap.has(p.job_id))
                .map(p => ({
                  id: p.id,
                  proposed_price: p.proposed_price,
                  status: p.status,
                  created_at: p.created_at,
                  job: jobMap.get(p.job_id)!
                }));
              setPendingProposals(proposalsWithJobs);
            }
          }
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

  const JobCard = ({ job, showProposalCount = false }: { job: Job; showProposalCount?: boolean }) => {
    const proposalCount = proposalCounts.get(job.id) || 0;
    
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
            {job.lawn_size && (
              <Badge variant="secondary">{job.lawn_size}</Badge>
            )}
            {job.preferred_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(job.preferred_date), 'MMM dd, yyyy')}
              </Badge>
            )}
            {showProposalCount && proposalCount > 0 && (
              <Badge variant="default" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {proposalCount} proposal{proposalCount !== 1 ? 's' : ''}
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
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`); }}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProposalCard = ({ proposal }: { proposal: ProposalWithJob }) => {
    return (
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer" 
        onClick={() => navigate(`/job/${proposal.job.id}`)}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{proposal.job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3" />
                {proposal.job.location}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Send className="h-3 w-3" />
              Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposal.job.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{proposal.job.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {proposal.job.lawn_size && (
              <Badge variant="secondary">{proposal.job.lawn_size}</Badge>
            )}
            {proposal.job.preferred_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(proposal.job.preferred_date), 'MMM dd, yyyy')}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Your Proposed Price</div>
              <div className="text-xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                J${proposal.proposed_price.toFixed(2)}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/job/${proposal.job.id}`); }}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Jobs</h1>
          <p className="text-muted-foreground">Manage your job requests and assignments</p>
        </div>

        <Tabs defaultValue={isCustomer ? "posted" : (pendingProposals.length > 0 ? "proposals" : "accepted")} className="w-full">
          <TabsList className="grid w-full max-w-lg" style={{ gridTemplateColumns: `repeat(${(isCustomer ? 1 : 0) + (isProvider ? 2 : 0)}, 1fr)` }}>
            {isCustomer && <TabsTrigger value="posted">Posted Jobs</TabsTrigger>}
            {isProvider && (
              <>
                <TabsTrigger value="proposals" className="gap-1">
                  <Send className="h-3 w-3" />
                  My Proposals
                  {pendingProposals.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {pendingProposals.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Accepted Jobs
                </TabsTrigger>
              </>
            )}
          </TabsList>

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
                    <JobCard key={job.id} job={job} showProposalCount={job.status === 'open'} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {isProvider && (
            <>
              <TabsContent value="proposals" className="mt-6">
                {pendingProposals.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Send className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You don't have any pending proposals</p>
                      <Button onClick={() => navigate('/browse-jobs')}>
                        Browse Available Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingProposals.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="accepted" className="mt-6">
                {acceptedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You haven't been accepted for any jobs yet</p>
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
            </>
          )}
        </Tabs>
      </main>
    </>
  );
}
