import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Trash2, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';

const COMMUNITIES = [
  { value: 'coral_spring', label: 'Coral Spring' },
  { value: 'florence_hall', label: 'Florence Hall' },
  { value: 'stonebrook_vista', label: 'Stonebrook Vista' },
  { value: 'stonebrook_manor', label: 'Stonebrook Manor' },
] as const;

interface Provider {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

interface Assignment {
  id: string;
  provider_id: string;
  community: string;
  created_at: string;
}

export default function AdminCommunities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminRole();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
    } else {
      navigate('/dashboard');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [providersRes, assignmentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, avatar_url, phone_number')
          .in('user_role', ['provider', 'both']),
        supabase
          .from('provider_community_assignments')
          .select('*'),
      ]);

      if (providersRes.error) throw providersRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setProviders(providersRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderAssignments = (providerId: string) => {
    return assignments.filter(a => a.provider_id === providerId);
  };

  const getCommunityLabel = (value: string) => {
    return COMMUNITIES.find(c => c.value === value)?.label || value;
  };

  const handleOpenAssignDialog = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedCommunity('');
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedProvider || !selectedCommunity || !user) return;

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('provider_community_assignments')
        .insert({
          provider_id: selectedProvider.id,
          community: selectedCommunity,
          assigned_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Provider is already assigned to this community');
          return;
        }
        throw error;
      }

      toast.success(`Assigned ${selectedProvider.full_name || selectedProvider.first_name} to ${getCommunityLabel(selectedCommunity)}`);
      setAssignDialogOpen(false);
      loadData();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, providerName: string, community: string) => {
    try {
      const { error } = await supabase
        .from('provider_community_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success(`Removed ${providerName} from ${getCommunityLabel(community)}`);
      loadData();
    } catch (error) {
      safeToast.error(error);
    }
  };

  const filteredProviders = providers.filter(p => {
    const name = (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getProviderName = (provider: Provider) => {
    return provider.full_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Unnamed Provider';
  };

  const getUnassignedCommunities = (providerId: string) => {
    const assigned = assignments.filter(a => a.provider_id === providerId).map(a => a.community);
    return COMMUNITIES.filter(c => !assigned.includes(c.value));
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Community Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Assign providers to communities. Only assigned providers can see and accept jobs from those communities.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{providers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Providers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
            <CardDescription>Manage community assignments for each provider</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProviders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery ? 'No providers match your search' : 'No providers found'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Communities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => {
                    const providerAssignments = getProviderAssignments(provider.id);
                    const unassigned = getUnassignedCommunities(provider.id);
                    return (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">
                          {getProviderName(provider)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {provider.phone_number || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {providerAssignments.length === 0 ? (
                              <span className="text-sm text-muted-foreground">No communities</span>
                            ) : (
                              providerAssignments.map((assignment) => (
                                <Badge key={assignment.id} variant="secondary" className="gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {getCommunityLabel(assignment.community)}
                                  <button
                                    onClick={() => handleRemoveAssignment(assignment.id, getProviderName(provider), assignment.community)}
                                    className="ml-1 hover:text-destructive"
                                    title="Remove assignment"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {unassigned.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignDialog(provider)}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Community</DialogTitle>
              <DialogDescription>
                Assign {selectedProvider ? getProviderName(selectedProvider) : ''} to a community.
                They will be able to see and accept jobs from that community.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider && getUnassignedCommunities(selectedProvider.id).map((community) => (
                    <SelectItem key={community.value} value={community.value}>
                      {community.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={!selectedCommunity || assigning}>
                {assigning ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
