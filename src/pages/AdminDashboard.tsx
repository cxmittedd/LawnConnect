import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

interface MonthlyStats {
  month: string;
  totalRevenue: number;
  totalTransactions: number;
  completedJobs: number;
  disputedJobsRevenue: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState("6");
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    completedJobs: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkAdminRole();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin, selectedMonths]);

  /**
   * Security Note: This client-side admin check is for UX optimization only.
   * The actual security is enforced by Row Level Security (RLS) policies on all admin tables.
   * Even if this check is bypassed, unauthorized users will see an empty UI because
   * RLS policies (using has_role(auth.uid(), 'admin')) block all data access server-side.
   */
  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
    } else {
      navigate("/dashboard");
    }
  };

  const loadStats = async () => {
    setLoading(true);
    
    const monthsToLoad = parseInt(selectedMonths);
    const monthlyStats: MonthlyStats[] = [];
    
    let grandTotalRevenue = 0;
    let grandTotalTransactions = 0;
    let grandTotalJobs = 0;

    for (let i = 0; i < monthsToLoad; i++) {
      const targetDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);

      // Fetch completed jobs for this month
      const { data: jobs } = await supabase
        .from("job_requests")
        .select("id, final_price, platform_fee, provider_payout, completed_at")
        .eq("status", "completed")
        .gte("completed_at", monthStart.toISOString())
        .lte("completed_at", monthEnd.toISOString());

      if (jobs && jobs.length > 0) {
        // Calculate platform revenue (30% normally, 40% from disputed providers)
        const totalPlatformFee = jobs.reduce((sum, job) => sum + (Number(job.platform_fee) || 0), 0);
        const totalTransactionVolume = jobs.reduce((sum, job) => sum + (Number(job.final_price) || 0), 0);
        
        // Calculate revenue from disputed accounts (jobs where platform took 40% instead of 30%)
        const disputedRevenue = jobs
          .filter(job => {
            const finalPrice = Number(job.final_price) || 0;
            const providerPayout = Number(job.provider_payout) || 0;
            // If payout is 60% of final price, it was a disputed provider
            return finalPrice > 0 && Math.abs(providerPayout / finalPrice - 0.6) < 0.01;
          })
          .reduce((sum, job) => sum + (Number(job.platform_fee) || 0), 0);

        monthlyStats.push({
          month: format(targetDate, "MMMM yyyy"),
          totalRevenue: totalPlatformFee,
          totalTransactions: totalTransactionVolume,
          completedJobs: jobs.length,
          disputedJobsRevenue: disputedRevenue,
        });

        grandTotalRevenue += totalPlatformFee;
        grandTotalTransactions += totalTransactionVolume;
        grandTotalJobs += jobs.length;
      } else {
        monthlyStats.push({
          month: format(targetDate, "MMMM yyyy"),
          totalRevenue: 0,
          totalTransactions: 0,
          completedJobs: 0,
          disputedJobsRevenue: 0,
        });
      }
    }

    setStats(monthlyStats);
    setTotals({
      totalRevenue: grandTotalRevenue,
      totalTransactions: grandTotalTransactions,
      completedJobs: grandTotalJobs,
    });
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-JM", {
      style: "currency",
      currency: "JMD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform revenue and transaction overview</p>
          </div>
          <Select value={selectedMonths} onValueChange={setSelectedMonths}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">All time platform earnings</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaction Volume</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(totals.totalTransactions)}</div>
                  <p className="text-xs text-muted-foreground">Total money processed through platform</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totals.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">Total jobs completed</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Platform Revenue Trend
              </CardTitle>
              <CardDescription>Monthly platform earnings from fees</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[...stats].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => value.split(" ")[0].slice(0, 3)}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(value) => `J$${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Jobs & Transactions
              </CardTitle>
              <CardDescription>Monthly completed jobs and transaction volume</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...stats].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => value.split(" ")[0].slice(0, 3)}
                      className="text-xs"
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${value}`}
                      className="text-xs"
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `J$${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === "completedJobs" ? value : formatCurrency(value),
                        name === "completedJobs" ? "Jobs" : "Volume"
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="completedJobs" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Completed Jobs"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="totalTransactions" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                      name="Transaction Volume"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Revenue and transaction volume by month</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="mb-2 sm:mb-0">
                      <h3 className="font-semibold text-foreground">{stat.month}</h3>
                      <p className="text-sm text-muted-foreground">{stat.completedJobs} jobs completed</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Platform Revenue</p>
                        <p className="font-semibold text-primary">{formatCurrency(stat.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">From Disputed</p>
                        <p className="font-semibold text-orange-500">{formatCurrency(stat.disputedJobsRevenue)}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">Transaction Volume</p>
                        <p className="font-semibold">{formatCurrency(stat.totalTransactions)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No data available for the selected period</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
