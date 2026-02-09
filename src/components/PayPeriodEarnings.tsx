import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Calendar, ChevronRight, ChevronDown, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, endOfMonth, startOfDay, subMonths } from 'date-fns';
import { toast } from 'sonner';

interface CompletedJobForPeriod {
  id: string;
  title: string;
  completed_at: string;
  final_price: number | null;
  base_price: number;
  provider_payout: number | null;
  platform_fee: number | null;
  accepted_provider_id: string;
  customer_id: string;
}

interface PayPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
  payoutDate: Date;
  value: string;
}

interface ProviderPeriodEarnings {
  provider_id: string;
  provider_name: string;
  jobs: CompletedJobForPeriod[];
  total_earnings: number;
  jobs_count: number;
}

// Generate semi-monthly pay periods:
// 1st-15th → paid on 21st of same month
// 16th-end of month → paid on 7th of next month
function generatePayPeriods(count: number = 12): PayPeriod[] {
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const periods: PayPeriod[] = [];
  
  // Start from current month and go backward
  let month = currentMonth;
  let year = currentYear;
  
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      // Second half of month: 16th - end of month (paid 7th next month)
      const lastDay = endOfMonth(new Date(year, month, 1));
      const startDate = new Date(year, month, 16);
      const endDate = lastDay;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const payoutDate = new Date(nextYear, nextMonth, 7);
      
      const isCurrent = today >= startDate && today <= endDate;
      const label = isCurrent
        ? `Current: ${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} (Paid ${format(payoutDate, 'MMM d')})`
        : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} (Paid ${format(payoutDate, 'MMM d')})`;
      
      periods.push({ label, startDate, endDate, payoutDate, value: `${year}-${month}-2` });
    } else {
      // First half of month: 1st - 15th (paid 21st same month)
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month, 15, 23, 59, 59, 999);
      const payoutDate = new Date(year, month, 21);
      
      const isCurrent = today >= startDate && today <= endDate;
      const label = isCurrent
        ? `Current: ${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} (Paid ${format(payoutDate, 'MMM d')})`
        : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} (Paid ${format(payoutDate, 'MMM d')})`;
      
      periods.push({ label, startDate, endDate, payoutDate, value: `${year}-${month}-1` });
      
      // Move to previous month for next iteration
      if (month === 0) { month = 11; year--; } else { month--; }
    }
  }
  
  return periods;
}

export function PayPeriodEarnings() {
  const [loading, setLoading] = useState(true);
  const [completedJobs, setCompletedJobs] = useState<CompletedJobForPeriod[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  
  const payPeriods = useMemo(() => generatePayPeriods(12), []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(payPeriods[0]?.value || '');

  const currentPeriod = useMemo(
    () => payPeriods.find(p => p.value === selectedPeriod),
    [payPeriods, selectedPeriod]
  );

  useEffect(() => {
    loadAllCompletedJobs();
  }, []);

  const loadAllCompletedJobs = async () => {
    setLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('job_requests')
        .select('id, title, completed_at, final_price, base_price, provider_payout, platform_fee, accepted_provider_id, customer_id')
        .eq('status', 'completed')
        .not('accepted_provider_id', 'is', null)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      setCompletedJobs((jobs || []) as CompletedJobForPeriod[]);

      // Get unique provider IDs
      const providerIds = [...new Set((jobs || []).map(j => j.accepted_provider_id).filter(Boolean))];
      
      if (providerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', providerIds);

        const map = new Map<string, string>();
        profiles?.forEach(p => {
          map.set(p.id, p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown');
        });
        setProfileMap(map);
      }
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs for selected period and group by provider
  const providerEarnings = useMemo((): ProviderPeriodEarnings[] => {
    if (!currentPeriod) return [];

    const periodJobs = completedJobs.filter(job => {
      const completedDate = new Date(job.completed_at);
      return completedDate >= currentPeriod.startDate && completedDate <= currentPeriod.endDate;
    });

    // Group by provider
    const grouped = new Map<string, CompletedJobForPeriod[]>();
    periodJobs.forEach(job => {
      const existing = grouped.get(job.accepted_provider_id) || [];
      existing.push(job);
      grouped.set(job.accepted_provider_id, existing);
    });

    const result: ProviderPeriodEarnings[] = Array.from(grouped.entries()).map(([providerId, jobs]) => ({
      provider_id: providerId,
      provider_name: profileMap.get(providerId) || 'Unknown',
      jobs,
      total_earnings: jobs.reduce((sum, j) => sum + Number(j.provider_payout || j.final_price || j.base_price), 0),
      jobs_count: jobs.length,
    }));

    result.sort((a, b) => b.total_earnings - a.total_earnings);
    return result;
  }, [completedJobs, currentPeriod, profileMap]);

  const periodTotal = providerEarnings.reduce((sum, p) => sum + p.total_earnings, 0);
  const periodJobsTotal = providerEarnings.reduce((sum, p) => sum + p.jobs_count, 0);

  const exportPeriodCSV = () => {
    if (providerEarnings.length === 0) {
      toast.error('No data to export for this period');
      return;
    }

    const headers = ['Provider Name', 'Jobs Completed', 'Total Earnings (JMD)'];
    const rows = providerEarnings.map(p => [
      p.provider_name,
      p.jobs_count.toString(),
      p.total_earnings.toFixed(2),
    ]);
    rows.push(['', '', '']);
    rows.push(['TOTAL', periodJobsTotal.toString(), periodTotal.toFixed(2)]);

    const csvContent = [
      `Pay Period: ${currentPeriod ? format(currentPeriod.startDate, 'MMM d, yyyy') + ' - ' + format(currentPeriod.endDate, 'MMM d, yyyy') : ''}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pay-period-${currentPeriod ? format(currentPeriod.endDate, 'yyyy-MM-dd') : 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Period earnings exported');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pay Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Pay Period Earnings
          </CardTitle>
          <CardDescription>Select a pay period to view provider earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[400px]">
                <SelectValue placeholder="Select a pay period" />
              </SelectTrigger>
              <SelectContent>
                {payPeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPeriodCSV}
              disabled={providerEarnings.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Period Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              J${periodTotal.toLocaleString('en-JM', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Jobs Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{periodJobsTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{providerEarnings.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Provider Earnings Breakdown
          </CardTitle>
          <CardDescription>
            {currentPeriod
              ? `${format(currentPeriod.startDate, 'MMM d, yyyy')} – ${format(currentPeriod.endDate, 'MMM d, yyyy')}`
              : 'Select a pay period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerEarnings.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No completed jobs in this pay period.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-center">Jobs</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerEarnings.map((provider) => {
                  const isExpanded = expandedProviders.has(provider.provider_id);
                  return (
                    <React.Fragment key={provider.provider_id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setExpandedProviders(prev => {
                            const next = new Set(prev);
                            if (next.has(provider.provider_id)) next.delete(provider.provider_id);
                            else next.add(provider.provider_id);
                            return next;
                          });
                        }}
                      >
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {provider.provider_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{provider.jobs_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          J${provider.total_earnings.toLocaleString('en-JM', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      {isExpanded && provider.jobs.map((job) => (
                        <TableRow key={job.id} className="bg-muted/30">
                          <TableCell className="pl-10 text-sm text-muted-foreground">{job.title}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {format(new Date(job.completed_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            J${Number(job.provider_payout || job.final_price || job.base_price).toLocaleString('en-JM', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
                {/* Total row */}
                <TableRow className="border-t-2 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{periodJobsTotal}</TableCell>
                  <TableCell className="text-right text-primary">
                    J${periodTotal.toLocaleString('en-JM', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
