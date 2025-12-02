import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors, DollarSign, Users, Shield } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: Scissors,
      title: 'Easy Job Posting',
      description: 'Customers post lawn cutting jobs with photos, location, and pricing starting from J$7,000.',
    },
    {
      icon: Users,
      title: 'Connect Providers',
      description: 'Service providers browse available jobs and submit proposals based on their expertise.',
    },
    {
      icon: DollarSign,
      title: 'Secure Transactions',
      description: 'Customers pay upfront, funds held until completion. 10% platform fee from each transaction.',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Rate and review system ensures quality service and builds community trust.',
    },
  ];

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">About LawnConnect</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Jamaica's trusted marketplace connecting homeowners with professional lawn care providers.
            </p>
          </div>

          <Card className="mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                LawnConnect was created to make finding and providing lawn care services simple and secure in Jamaica. 
                We connect homeowners who need quality lawn maintenance with skilled service providers looking for work. 
                With transparent pricing starting at J$7,000, secure payments, and a trusted review system, 
                we're building a community where both customers and providers succeed.
              </p>
            </CardContent>
          </Card>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="bg-primary/5">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Why Choose LawnConnect?</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                We provide a safe, transparent platform for both customers and service providers. 
                With escrow payments, a 10% platform fee, and verified reviews, LawnConnect ensures 
                quality service and fair compensation. Join Jamaica's growing community of satisfied 
                homeowners and professional lawn care providers.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
