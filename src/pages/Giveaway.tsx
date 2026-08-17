import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/components/SEO';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, CalendarDays, MapPin, Phone, Trophy, CheckCircle, ArrowRight } from 'lucide-react';
import { GIVEAWAY } from '@/lib/giveaway';

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'LawnConnect JMD $50,000 Giveaway',
  description:
    'Book a lawn care job in Coral Springs Village between September 1 and September 30, 2026 for a chance to win JMD $50,000. Make sure to select Coral Springs under Communities when posting the job. Winner drawn October 1, 2026.',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: 'Coral Springs Village, Jamaica',
    address: { '@type': 'PostalAddress', addressLocality: 'Coral Springs Village', addressCountry: 'JM' },
  },
  organizer: { '@type': 'Organization', name: 'LawnConnect', url: 'https://connectlawn.com' },
};

export default function Giveaway() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: MapPin,
      title: 'Be a Coral Springs resident',
      description: `The giveaway is open to ${GIVEAWAY.community} residents only. When posting your job, select Coral Springs under Communities.`,
    },
    {
      icon: CalendarDays,
      title: 'Book between Sept 1 – 30, 2026',
      description: 'Post and pay for any lawn care job during September 2026. Every paid booking is one entry.',
    },
    {
      icon: Trophy,
      title: 'Winner drawn October 1, 2026',
      description: 'One entry is picked at random and the winner receives JMD $50,000.',
    },
    {
      icon: Phone,
      title: 'We call and email you',
      description: 'The winner is contacted by phone and email using the details on their LawnConnect account.',
    },
  ];

  const rules = [
    'Open to residents of Coral Springs Village only.',
    'When posting the job, you must select Coral Springs under the Communities field.',
    'Entry requires a paid lawn care booking made through LawnConnect between September 1 and September 30, 2026.',
    'Each paid booking counts as one entry — more bookings means more chances to win.',
    'Cancelled or refunded bookings are not eligible.',
    'The winner is selected at random on October 1, 2026.',
    'The winner will be contacted by phone call and email at the contact details on their account.',
    'Prize is JMD $50,000 and is not transferable.',
  ];

  return (
    <>
      <SEO
        title="Win JMD $50,000 — LawnConnect September Giveaway"
        description="Book lawn care in Coral Springs Village between September 1–30, 2026 for a chance to win JMD $50,000. Select Coral Springs under Communities when posting. Winner drawn October 1, 2026."
        path="/giveaway"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(JSONLD)}</script>
      </Helmet>
      <Navigation />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <section className="mb-12 text-center animate-fade-in">
            <Badge className="mb-4 gap-1.5">
              <Gift className="h-3.5 w-3.5" />
              September 2026 Giveaway
            </Badge>
            <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              Win <span className="text-primary">JMD $50,000</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Book any lawn care job in {GIVEAWAY.community} between <strong>September 1</strong> and{' '}
              <strong>September 30, 2026</strong> and you're automatically entered. Be sure to select{' '}
              <strong>Coral Springs</strong> under Communities when posting. One lucky resident is drawn on{' '}
              <strong>October 1, 2026</strong>.
            </p>
            <Button size="lg" className="text-lg px-8" onClick={() => navigate('/post-job')}>
              Book a job to enter
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </section>

          <section className="mb-12 grid gap-6 md:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="mb-1 font-semibold">{step.title}</h2>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="mb-12">
            <CardContent className="p-8">
              <h2 className="mb-6 text-2xl font-bold">Giveaway Rules</h2>
              <ul className="space-y-3">
                {rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            Questions? <Link to="/contact" className="text-primary hover:underline">Contact us</Link> — or review our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </div>
        </div>
      </main>
    </>
  );
}
