import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Scissors, Users, DollarSign, CheckCircle, ArrowRight } from 'lucide-react';
import InstallBanner from '@/components/InstallBanner';

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
      icon: Scissors,
      title: 'Post Lawn Jobs',
      description: 'Customers post their lawn cutting needs with photos and details. Start at J$7,000.',
    },
    {
      icon: Users,
      title: 'Connect with Providers',
      description: 'Service providers browse jobs and submit proposals to customers.',
    },
    {
      icon: DollarSign,
      title: 'Secure Payments',
      description: 'Customers pay upfront, funds held securely until job completion. 10% platform fee.',
    },
    {
      icon: CheckCircle,
      title: 'Quality Service',
      description: 'Rate and review service providers. Build trust in the community.',
    },
  ];

  return (
    <div className="min-h-screen bg-page-pattern">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">LawnConnect</span>
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
            Connect for
            <span className="block text-primary mt-2">Lawn Care Services</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Jamaica's premier platform connecting homeowners with professional lawn cutting services. 
            Post jobs or find work - all starting from J$7,000.
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
            Join LawnConnect
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
              Whether you need your lawn cut or you're looking to provide lawn care services, 
              LawnConnect makes it easy to connect.
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>
      <InstallBanner />
    </div>
  );
};

export default Index;
