import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { 
  Scissors, Users, DollarSign, CheckCircle, ArrowRight, Sun, Moon,
  Leaf, TreeDeciduous, Droplets, Shield, Star, MapPin, Clock, Award
} from 'lucide-react';
import InstallBanner from '@/components/InstallBanner';
import lawnConnectLogo from '@/assets/lawnconnect-logo.png';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const howItWorks = [
    {
      step: 1,
      title: 'Post Your Lawn Care Job',
      description: 'Describe your lawn care needs - whether it\'s regular mowing, landscaping, or garden maintenance across Jamaica.',
    },
    {
      step: 2,
      title: 'Get Multiple Quotes',
      description: 'Receive competitive quotes from verified lawn care providers in your area within hours.',
    },
    {
      step: 3,
      title: 'Compare and Hire',
      description: 'Review provider ratings, prices, and profiles. Choose the best match and book instantly with secure payments.',
    },
  ];

  const services = [
    {
      icon: Scissors,
      title: 'Lawn Mowing Services',
      description: 'Regular grass cutting and wacker man services for residential and commercial properties.',
    },
    {
      icon: Leaf,
      title: 'Landscaping & Design',
      description: 'Transform your outdoor space with professional landscapers and garden designers.',
    },
    {
      icon: TreeDeciduous,
      title: 'Tree Cutting & Trimming',
      description: 'Safe tree removal, pruning, and maintenance by experienced professionals.',
    },
    {
      icon: Droplets,
      title: 'Garden Maintenance',
      description: 'Ongoing care including weeding, pruning, fertilizing, and irrigation system repairs.',
    },
  ];

  const parishes = [
    'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester',
    'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny',
    'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'
  ];

  const popularLocations = ['Portmore', 'Spanish Town', 'Mandeville', 'Montego Bay', 'Ocho Rios', 'Negril'];

  const whyChoose = [
    { icon: Shield, title: 'Verified Providers', description: 'All lawn care professionals are vetted and reviewed' },
    { icon: DollarSign, title: 'Competitive Pricing', description: 'Get multiple quotes and choose the best value' },
    { icon: MapPin, title: 'Island-Wide Coverage', description: 'From Kingston to Negril, we cover all Jamaica' },
    { icon: Clock, title: 'Easy Booking', description: 'Book online 24/7 with secure payments' },
    { icon: Award, title: 'Quality Guarantee', description: 'Satisfaction guaranteed or your money back' },
    { icon: Star, title: 'Real Reviews', description: 'Read honest feedback from Jamaican homeowners' },
  ];

  const testimonials = [
    {
      quote: "Found an excellent gardener in Portmore within hours. Great service!",
      name: "Sarah M.",
      location: "St. Catherine",
      rating: 5,
    },
    {
      quote: "Multiple quotes made it easy to find affordable lawn care in Kingston.",
      name: "Michael T.",
      location: "Kingston",
      rating: 5,
    },
    {
      quote: "Professional landscaping transformed my backyard. Highly recommend LawnConnect!",
      name: "Andrea B.",
      location: "St. Andrew",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How much does lawn care cost in Jamaica?",
      answer: "Lawn care prices in Jamaica vary by service and property size. Basic lawn mowing typically ranges from JMD 2,000-8,000 per visit, while full landscaping projects can range from JMD 50,000-500,000+. Use LawnConnect to get free quotes from multiple providers and compare prices."
    },
    {
      question: "How do I find reliable lawn care providers in Jamaica?",
      answer: "LawnConnect makes it easy to find verified lawn care professionals across Jamaica. Simply post your job, receive quotes from multiple providers, and review their ratings and customer feedback before hiring."
    },
    {
      question: "What areas of Jamaica do you cover?",
      answer: "LawnConnect connects you with lawn care providers across all 14 parishes including Kingston, St. Andrew, Montego Bay, Ocho Rios, Portmore, Spanish Town, Mandeville, and every parish island-wide."
    },
    {
      question: "What services can I book through LawnConnect?",
      answer: "You can book lawn mowing, landscaping design, garden maintenance, tree cutting, weed control, irrigation installation, land clearing, and all professional lawn care services in Jamaica."
    },
    {
      question: "Are the lawn care providers verified?",
      answer: "Yes, all providers on LawnConnect are verified and reviewed by real customers. You can see ratings, reviews, and work history before making your hiring decision."
    },
  ];

  const stats = [
    { value: "500+", label: "Jobs Completed" },
    { value: "200+", label: "Verified Providers" },
    { value: "4.8/5", label: "Average Rating" },
    { value: "14", label: "Parishes Covered" },
  ];

  return (
    <div className="min-h-screen bg-page-pattern">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src={lawnConnectLogo} 
                alt="LawnConnect Jamaica Lawn Care Marketplace Logo" 
                className="h-24 w-24 object-contain" 
              />
              <span className="text-xl font-bold text-foreground">LawnConnect</span>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <Button variant="outline" onClick={() => navigate('/about')}>
                About
              </Button>
              <Button onClick={() => navigate('/auth')}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Jamaica's Premier
              <span className="block text-primary mt-2">Lawn Care Marketplace</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Find and hire trusted lawn care professionals across Jamaica. Get multiple quotes, compare prices, 
              and book the best provider for your lawn mowing, landscaping, and garden maintenance needs in 
              Kingston, Montego Bay, and all 14 parishes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
                Get Free Quotes Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate('/auth')}>
                Join as Provider
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <Card key={stat.label} className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How LawnConnect Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {howItWorks.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Professional Lawn Care Services Across Jamaica
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From regular lawn mowing to complete landscaping transformations, find the right professional for every outdoor need.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Parish Coverage */}
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Serving All 14 Parishes of Jamaica
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              We connect you with lawn care professionals across the entire island.
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto mb-8">
              {parishes.map((parish) => (
                <span 
                  key={parish} 
                  className="px-4 py-2 bg-card rounded-full text-sm font-medium border border-border hover:border-primary transition-colors"
                >
                  {parish}
                </span>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Popular locations:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {popularLocations.map((location) => (
                  <span key={location} className="text-primary font-medium">
                    {location}
                  </span>
                )).reduce((prev, curr, i) => (
                  i === 0 ? [curr] : [...prev, <span key={`dot-${i}`} className="text-muted-foreground">•</span>, curr]
                ), [] as React.ReactNode[])}
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose LawnConnect */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose LawnConnect for Your Lawn Care Needs
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {whyChoose.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4 p-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Jamaican Homeowners Say
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Frequently Asked Questions About Lawn Care in Jamaica
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Get answers to common questions about hiring lawn care professionals in Jamaica.
          </p>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    <h3 className="font-medium">{faq.question}</h3>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                Whether you need your lawn cut or you're looking to provide lawn care services, 
                LawnConnect makes it easy to connect.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
                  Post Your First Job Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* SEO-Optimized Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={lawnConnectLogo} 
                  alt="LawnConnect Jamaica" 
                  className="h-10 w-10 object-contain" 
                />
                <span className="font-bold text-lg">LawnConnect</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Jamaica's Premier Lawn Care Marketplace connecting customers with verified professionals.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>📧 officiallawnconnect@gmail.com</p>
                <p>📍 Kingston, Jamaica</p>
                <p>🕒 Available 24/7 Online</p>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Mowing Jamaica
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Landscaping Services Jamaica
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Garden Maintenance Jamaica
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Tree Cutting Services
                  </span>
                </li>
              </ul>
            </div>

            {/* Popular Locations */}
            <div>
              <h4 className="font-semibold mb-4">Popular Locations</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Care Kingston
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Care Montego Bay
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Care Portmore
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Care Spanish Town
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                    Lawn Care Mandeville
                  </span>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                    Become a Provider
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="text-muted-foreground hover:text-primary transition-colors">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} LawnConnect. All rights reserved. Jamaica's trusted lawn care marketplace.
            </p>
          </div>
        </div>
      </footer>

      <InstallBanner />
    </div>
  );
};

export default Index;
