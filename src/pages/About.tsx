import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Target, Users, Zap } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: Briefcase,
      title: 'Service Management',
      description: 'Easily create and manage your service offerings with detailed descriptions and pricing.',
    },
    {
      icon: Target,
      title: 'Invoice Tracking',
      description: 'Keep track of all your invoices, their status, and payment history in one place.',
    },
    {
      icon: Users,
      title: 'Client Management',
      description: 'Maintain organized records of your clients and their transaction history.',
    },
    {
      icon: Zap,
      title: 'Fast Checkout',
      description: 'Process payments quickly with our streamlined checkout experience.',
    },
  ];

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">About InvoicePro</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A modern platform for managing your services, invoices, and client payments all in one place.
            </p>
          </div>

          <Card className="mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                InvoicePro was built to simplify the business management process for freelancers and small businesses. 
                We understand that managing services, creating invoices, and tracking payments can be time-consuming 
                and complex. Our platform streamlines these processes, allowing you to focus on what matters most: 
                growing your business and serving your clients.
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
              <h2 className="text-2xl font-bold mb-4">Why Choose InvoicePro?</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                We combine powerful features with an intuitive interface to provide a seamless experience. 
                Whether you're managing a handful of clients or scaling your business, InvoicePro grows with you. 
                Our platform is designed to be simple yet comprehensive, ensuring you have all the tools you need 
                without unnecessary complexity.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
