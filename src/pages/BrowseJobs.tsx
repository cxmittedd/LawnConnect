import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, Image, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';

const proposalSchema = z.object({
  proposed_price: z.number().min(7000, 'Minimum price is J$7000'),
  message: z.string().trim().max(500).optional(),
});

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  lawn_size: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  additional_requirements: string | null;
  base_price: number;
  customer_offer: number | null;
  created_at: string;
}

export default function BrowseJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposalData, setProposalData] = useState({
    proposed_price: '',
    message: '',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .in('status', ['open', 'in_negotiation'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProposal = (job: Job) => {
    setSelectedJob(job);
    setProposalData({
      proposed_price: job.customer_offer?.toString() || job.base_price.toString(),
      message: '',
    });
    setProposalOpen(true);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = proposalSchema.safeParse({
      proposed_price: parseFloat(proposalData.proposed_price),
      message: proposalData.message,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('job_proposals').insert({
        job_id: selectedJob!.id,
        provider_id: user!.id,
        proposed_price: parseFloat(proposalData.proposed_price),
        message: proposalData.message || null,
      });

      if (error) {
        if (error.message.includes('unique')) {
          toast.error('You have already submitted a proposal for this job');
        } else {
          throw error;
        }
      } else {
        toast.success('Proposal submitted successfully!');
        setProposalOpen(false);
        loadJobs();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Browse Jobs</h1>
          <p className="text-muted-foreground">Find lawn cutting opportunities near you</p>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No jobs available at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Open</Badge>
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
                        {format(new Date(job.preferred_date), 'MMM dd')}
                      </Badge>
                    )}
                    {job.preferred_time && (
                      <Badge variant="outline">{job.preferred_time}</Badge>
                    )}
                  </div>

                  {job.additional_requirements && (
                    <div className="text-sm">
                      <span className="font-medium">Additional work:</span>{' '}
                      <span className="text-muted-foreground">{job.additional_requirements}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Offered Price</div>
                      <div className="text-2xl font-bold text-primary flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        J${(job.customer_offer || job.base_price).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min: J${job.base_price.toFixed(2)}
                      </div>
                    </div>
                    <Button onClick={() => handleOpenProposal(job)}>
                      Submit Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Proposal</DialogTitle>
              <DialogDescription>
                Propose your price for this job (minimum J$7,000)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitProposal}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="proposed_price">Your Price (J$)</Label>
                  <Input
                    id="proposed_price"
                    type="number"
                    min="7000"
                    step="100"
                    value={proposalData.proposed_price}
                    onChange={(e) =>
                      setProposalData({ ...proposalData, proposed_price: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer offered: J${selectedJob?.customer_offer?.toFixed(2) || selectedJob?.base_price.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Introduce yourself and explain your experience..."
                    value={proposalData.message}
                    onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProposalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
