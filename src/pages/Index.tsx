import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Briefcase, FileText, CreditCard, TrendingUp, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Briefcase,
      title: 'Service Management',
      description: 'Create and manage your service offerings with detailed pricing and descriptions.',
    },
    {
      icon: FileText,
      title: 'Invoice Tracking',
      description: 'Generate professional invoices and track their status from pending to paid.',
    },
    {
      icon: CreditCard,
      title: 'Quick Checkout',
      description: 'Process payments with our streamlined checkout experience.',
    },
    {
      icon: TrendingUp,
      title: 'Business Insights',
      description: 'Monitor your revenue, pending payments, and overall business performance.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">InvoicePro</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/about')}>
                About
              </Button>
              <Button onClick={() => navigate('/auth')}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Manage Your Business
            <span className="block text-primary mt-2">With Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The all-in-one platform for managing services, invoices, and payments. 
            Streamline your workflow and grow your business.
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
            Start Free Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Join thousands of professionals who trust InvoicePro to manage their business operations.
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
