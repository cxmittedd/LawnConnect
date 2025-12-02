import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, FileText, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalServices: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const [servicesResult, invoicesResult] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('invoices').select('*').eq('user_id', user.id),
      ]);

      const totalServices = servicesResult.count || 0;
      const invoices = invoicesResult.data || [];
      const pendingInvoices = invoices.filter((inv) => inv.status === 'pending').length;
      const totalRevenue = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      setStats({
        totalServices,
        totalInvoices: invoices.length,
        pendingInvoices,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Services',
      value: stats.totalServices,
      icon: Briefcase,
      description: 'Services offered',
      action: () => navigate('/services'),
      color: 'text-primary',
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      description: 'All time invoices',
      action: () => navigate('/invoices'),
      color: 'text-info',
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: TrendingUp,
      description: 'Awaiting payment',
      action: () => navigate('/invoices'),
      color: 'text-warning',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: 'From paid invoices',
      action: () => navigate('/invoices'),
      color: 'text-success',
    },
  ];

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

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your business.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={stat.action}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your business operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => navigate('/services')}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Manage Services
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/invoices')}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Create Invoice
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/checkout')}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Process Payment
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Set up your business profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <p className="text-sm">Add your first service</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <p className="text-sm">Create your first invoice</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <p className="text-sm">Explore payment options</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
