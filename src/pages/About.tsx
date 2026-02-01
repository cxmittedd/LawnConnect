import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors, DollarSign, Users, Shield, MapPin, Star, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Scissors,
      title: 'Easy Job Posting',
      description: 'Customers post lawn cutting jobs with photos, location, and preferred scheduling across all 14 parishes of Jamaica.',
    },
    {
      icon: Users,
      title: 'Connect with Verified Providers',
      description: 'Service providers browse available jobs and submit competitive proposals based on their expertise and location.',
    },
    {
      icon: DollarSign,
      title: 'Secure Transactions',
      description: 'Customers pay upfront with funds held securely in escrow until job completion is confirmed.',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Our rating and review system ensures quality lawn care service and builds community trust.',
    },
  ];

  const benefits = [
    { icon: MapPin, text: 'Island-wide coverage across all 14 parishes' },
    { icon: Star, text: 'Verified providers with real customer reviews' },
    { icon: Clock, text: '24/7 online booking and support' },
    { icon: CheckCircle, text: 'Satisfaction guarantee on all services' },
  ];

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              About LawnConnect - Jamaica's Trusted Lawn Care Marketplace
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connecting Jamaican homeowners with professional lawn care providers since 2024. 
              From Kingston to Montego Bay, we make finding quality lawn care simple and secure.
            </p>
          </div>

          <Card className="mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                LawnConnect was created to revolutionize how Jamaicans find and hire lawn care professionals. 
                We bridge the gap between homeowners who need quality lawn maintenance and skilled service 
                providers looking for reliable work opportunities across the island.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                With secure escrow payments, verified provider profiles, and a trusted review system, 
                we're building Jamaica's largest community of satisfied homeowners and professional 
                lawn care providers. Whether you need regular lawn mowing in Portmore, landscaping 
                in Spanish Town, or garden maintenance in Mandeville, LawnConnect connects you with 
                the right professional.
              </p>
            </CardContent>
          </Card>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">How LawnConnect Works</h2>
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

          <Card className="mb-12 bg-primary/5">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Why Jamaicans Choose LawnConnect</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{benefit.text}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground mb-12">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="opacity-90 leading-relaxed max-w-2xl mx-auto mb-6">
                Join thousands of Jamaican homeowners and lawn care professionals 
                who trust LawnConnect for their lawn care needs. Post your first job 
                free or sign up as a provider today.
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={() => navigate('/auth')}
              >
                Join LawnConnect Today
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              By using LawnConnect, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
              <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
