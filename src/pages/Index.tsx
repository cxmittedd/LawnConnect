import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight, CalendarCheck, CheckCircle2, CreditCard, Gift, HeartHandshake, Home, MapPin, Menu,
  MessageCircle, Moon, ShieldCheck, Sparkles, Sun, Users, X, XCircle, Sprout, ClipboardCheck, Headphones, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";
import InstallBanner from "@/components/InstallBanner";
import { SEO } from "@/components/SEO";
import { isGiveawayVisible, GIVEAWAY } from "@/lib/giveaway";
import lawnConnectLogo from "@/assets/lawnconnect-logo.png";
import heroImage from "@/assets/hero-community.jpg";
import lawnMedium from "@/assets/lawn-size-medium.jpg";
import lawnLarge from "@/assets/lawn-size-large.jpg";
import lawnSmall from "@/assets/lawn-size-small.jpg";
import coralSpringVillage from "@/assets/coral-spring-village.jpg.asset.json";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "How does LawnConnect work?", acceptedAnswer: { "@type": "Answer", text: "Choose your service and preferred date, pay securely through LawnConnect, and a lawn cutter in your community completes the job. You confirm when it's done." } },
    { "@type": "Question", name: "How much does a lawn cut cost in Jamaica?", acceptedAnswer: { "@type": "Answer", text: "Prices are set upfront by lawn size, starting from JMD 6,500 for small lots. You see the exact price before you pay." } },
    { "@type": "Question", name: "Is payment secure?", acceptedAnswer: { "@type": "Answer", text: "Yes. Payments are processed securely through LawnConnect before the service, and you have a platform to report any issues." } },
  ],
};

const NAV = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#residents", label: "For Residents" },
  { href: "#cutters", label: "For Lawn Cutters" },
  { href: "#communities", label: "Communities" },
];

const COMMUNITIES = [
  { name: "Coral Springs Village", parish: "Trelawny", img: coralSpringVillage.url },
  { name: "Castlewood", parish: "Jamaica", img: lawnLarge },
  { name: "Holland Estate", parish: "Jamaica", img: lawnSmall },
];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
    {children}
  </span>
);

const Index = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const book = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="LawnConnect — Book a Lawn Cut in Your Jamaican Community"
        description="LawnConnect connects residents with reliable lawn cutters in their communities across Jamaica. Upfront pricing, secure payment, easy booking."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(FAQ_JSONLD)}</script>
      </Helmet>

      {/* Navigation */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-card/80 backdrop-blur-md shadow-sm border-b border-border/60" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-[72px] items-center justify-between gap-4 px-4 py-3">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <img src={lawnConnectLogo} alt="LawnConnect" className="h-11 w-11 object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-forest dark:text-foreground">
              Lawn<span className="text-primary">Connect</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-7">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {n.label}
              </a>
            ))}
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} aria-label="Toggle theme" className="hidden sm:inline-flex p-2.5 rounded-full hover:bg-accent transition-colors">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <Button variant="ghost" className="hidden sm:inline-flex font-medium" onClick={() => navigate("/auth")}>Log In</Button>
            <Button onClick={book} className="rounded-full px-5 font-semibold shadow-soft">Book a Lawn Cut</Button>
            <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1 animate-fade-in">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-accent">{n.label}</a>
            ))}
            <Link to="/about" className="block rounded-lg px-3 py-3 font-medium hover:bg-accent">About Us</Link>
            <Link to="/auth" className="block rounded-lg px-3 py-3 font-medium hover:bg-accent">Log In</Link>
            <button onClick={toggleTheme} className="block w-full text-left rounded-lg px-3 py-3 font-medium hover:bg-accent">
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-8 pb-16 md:pt-14 md:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-slide-up">
              <Eyebrow><Sprout className="h-3.5 w-3.5" /> Jamaica's lawn cutting platform</Eyebrow>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-forest dark:text-foreground sm:text-5xl lg:text-6xl">
                Your Lawn.<br />Your Community.<br /><span className="text-primary">Connected.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                LawnConnect connects residents with reliable lawn cutters in their communities, making it easier to book, pay, and get the job done.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={book} className="h-[52px] rounded-full px-8 text-base font-semibold shadow-soft">
                  Book a Lawn Cut <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild className="h-[52px] rounded-full px-8 text-base font-semibold bg-card">
                  <a href="#how-it-works">How LawnConnect Works</a>
                </Button>
              </div>
              <p className="mt-6 text-sm font-medium text-muted-foreground">
                Secure payments <span className="mx-1.5 text-fresh">•</span> Local lawn cutters <span className="mx-1.5 text-fresh">•</span> Convenient booking
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] shadow-float">
                <img src={heroImage} alt="Well-kept lawns in a Jamaican residential community" width={1600} height={1104} className="h-[420px] w-full object-cover md:h-[520px]" />
              </div>
              <div className="absolute -left-4 top-8 hidden sm:flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur px-4 py-3 shadow-float animate-fade-in">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Lawn Cutting</p><p className="text-sm font-semibold">Booking confirmed</p></div>
              </div>
              <div className="absolute -right-3 top-1/2 hidden sm:flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur px-4 py-3 shadow-float animate-fade-in">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><MapPin className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Community</p><p className="text-sm font-semibold">Coral Springs Village</p></div>
              </div>
              <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur px-4 py-3 shadow-float animate-fade-in">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><ShieldCheck className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Payment</p><p className="text-sm font-semibold">Securely processed</p></div>
              </div>
              <span className="absolute right-4 bottom-4 rounded-full bg-forest/70 px-2.5 py-1 text-[10px] font-medium text-forest-foreground">Example</span>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-border/70 bg-card">
          <div className="container mx-auto grid gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, t: "Local Lawn Cutters", d: "Find lawn cutters within your community." },
              { icon: ShieldCheck, t: "Secure Payments", d: "Pay through LawnConnect with confidence." },
              { icon: CalendarCheck, t: "Easy Booking", d: "Choose your preferred date and service." },
              { icon: HeartHandshake, t: "Community Focused", d: "Built around the communities we serve." },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="flex gap-4">
                <I className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.75} />
                <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Promotion */}
        {isGiveawayVisible() && (
          <section className="container mx-auto px-4 pt-12">
            <Link to="/giveaway" className="group flex flex-col items-start gap-4 rounded-3xl bg-sun/15 border border-sun/50 p-6 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun text-sun-foreground"><Gift className="h-6 w-6" /></div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-forest dark:text-sun">Special offer</p>
                <p className="text-lg font-bold">{GIVEAWAY.prize} Giveaway — book to enter</p>
              </div>
              <span className="inline-flex items-center font-semibold text-primary">Learn more <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="container mx-auto scroll-mt-24 px-4 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold text-forest dark:text-foreground md:text-4xl">Getting Your Lawn Cut Should Be Simple.</h2>
          </div>
          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-10 hidden h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 md:block" />
            {[
              { n: "01", icon: CalendarCheck, t: "Book", d: "Choose your service and preferred date." },
              { n: "02", icon: CreditCard, t: "Pay", d: "Pay securely through LawnConnect." },
              { n: "03", icon: Sparkles, t: "Relax", d: "Your lawn cutter completes the job and you confirm the service." },
            ].map(({ n, icon: I, t, d }) => (
              <div key={n} className="relative rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft hover-lift">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
                  <I className="h-8 w-8" strokeWidth={1.75} />
                </div>
                <p className="mt-6 text-sm font-bold text-fresh">STEP {n}</p>
                <h3 className="mt-1 text-2xl font-bold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The real problem */}
        <section className="bg-card border-y border-border/70">
          <div className="container mx-auto px-4 py-20 md:py-24">
            <h2 className="mx-auto max-w-3xl text-center text-3xl font-extrabold text-forest dark:text-foreground md:text-4xl">
              Because Finding a Reliable Lawn Cutter Shouldn't Be This Hard.
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-muted/50 p-8">
                <p className="mb-5 text-sm font-bold uppercase tracking-wider text-muted-foreground">The usual hassle</p>
                <ul className="space-y-4">
                  {["Cutter doesn't show up", "Hard to coordinate schedules", "Paying upfront without certainty", "No clear way to resolve problems"].map((x) => (
                    <li key={x} className="flex items-center gap-3 text-lg"><XCircle className="h-5 w-5 shrink-0 text-destructive/80" />{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-forest p-8 text-forest-foreground shadow-float">
                <p className="mb-5 text-sm font-bold uppercase tracking-wider text-fresh">With LawnConnect</p>
                <ul className="space-y-4">
                  {["Book through one platform", "Know when your service is scheduled", "Secure payment process", "A platform to report issues and get support"].map((x) => (
                    <li key={x} className="flex items-center gap-3 text-lg"><CheckCircle2 className="h-5 w-5 shrink-0 text-fresh" />{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Difference */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>The LawnConnect difference</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold text-forest dark:text-foreground md:text-4xl">More Than a Lawn Cut.</h2>
            <p className="mt-4 text-lg text-muted-foreground">A structured connection between residents and the local lawn cutters who already serve their neighbourhoods.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Home, t: "Convenience", d: "Book without chasing down a lawn cutter." },
              { icon: ClipboardCheck, t: "Accountability", d: "Customers have a platform to communicate issues and confirm completed work." },
              { icon: Users, t: "Community", d: "LawnConnect connects residents with service providers who already operate within local communities." },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-3xl border border-border/70 bg-card p-8 shadow-soft hover-lift">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent"><I className="h-6 w-6 text-primary" strokeWidth={1.75} /></div>
                <h3 className="mt-5 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Residents & Cutters */}
        <section className="container mx-auto grid gap-6 px-4 pb-20 lg:grid-cols-2">
          <div id="residents" className="scroll-mt-24 rounded-[2rem] border border-border/70 bg-card p-8 md:p-10 shadow-soft">
            <Eyebrow>For Residents</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold text-forest dark:text-foreground">Skip the searching, calling, and waiting.</h2>
            <p className="mt-3 text-muted-foreground">Book your lawn cut through LawnConnect and manage your service from one place.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: CalendarCheck, t: "Easy Booking", d: "Choose your preferred service and date." },
                { icon: CreditCard, t: "Secure Payment", d: "Pay through the platform." },
                { icon: MessageCircle, t: "Service Tracking", d: "Keep track of your booking." },
                { icon: Headphones, t: "Support", d: "Have somewhere to turn if something goes wrong." },
              ].map(({ icon: I, t, d }) => (
                <div key={t} className="rounded-2xl bg-muted/60 p-5">
                  <I className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold">{t}</p>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            <Button size="lg" onClick={book} className="mt-8 rounded-full px-7 font-semibold">Book Your Lawn Cut <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          <div id="cutters" className="scroll-mt-24 rounded-[2rem] bg-forest p-8 md:p-10 text-forest-foreground shadow-float">
            <span className="inline-flex rounded-full bg-fresh/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fresh">For Lawn Cutters</span>
            <h2 className="mt-4 text-3xl font-extrabold">Turn the work you already do into more opportunities.</h2>
            <p className="mt-3 opacity-80">LawnConnect helps lawn cutters connect with customers in their communities and manage bookings through one platform.</p>
            <ul className="mt-8 space-y-4">
              {["Find more customers", "Build your reputation", "Manage bookings", "Get paid through the platform", "Grow your lawn-cutting business"].map((x) => (
                <li key={x} className="flex items-center gap-3 text-lg"><CheckCircle2 className="h-5 w-5 text-fresh" />{x}</li>
              ))}
            </ul>
            <Button size="lg" onClick={book} className="mt-8 rounded-full bg-fresh px-7 font-semibold text-forest hover:bg-fresh/90">Become a Lawn Cutter <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>

        {/* Communities */}
        <section id="communities" className="scroll-mt-24 bg-card border-y border-border/70">
          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <Eyebrow><MapPin className="h-3.5 w-3.5" /> Communities</Eyebrow>
                <h2 className="mt-4 text-3xl font-extrabold text-forest dark:text-foreground md:text-4xl">Built Around Your Community.</h2>
                <p className="mt-4 text-lg text-muted-foreground">LawnConnect is designed to connect residents with lawn cutters who already serve communities across Jamaica.</p>
              </div>
              <Button variant="outline" onClick={book} className="rounded-full px-6 font-semibold">Find LawnConnect in Your Community</Button>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {COMMUNITIES.map((c) => (
                <button key={c.name} onClick={book} className="group overflow-hidden rounded-3xl border border-border/70 bg-background text-left shadow-soft hover-lift">
                  <div className="h-48 overflow-hidden">
                    <img src={c.img} alt={`Lawn in ${c.name}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-lg font-bold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">Book a lawn cutter who serves your community.</p>
                    <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">Book Here <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Our story</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold text-forest dark:text-foreground md:text-4xl">Built From a Problem We Experienced Ourselves.</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              LawnConnect started with a familiar frustration: the grass was high, and the regular lawn cutter just wasn't showing up.
              We saw a chance to make it easier for residents to get reliable service — and for hard-working lawn cutters to find more customers right in their own communities.
            </p>
            <Link to="/about" className="mt-6 inline-flex items-center font-semibold text-primary">Read more about us <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-forest px-8 py-16 text-center text-forest-foreground md:py-20">
            <img src={heroImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-15" loading="lazy" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold md:text-5xl">Ready to Get Your Lawn Looking Good?</h2>
              <p className="mt-4 text-lg opacity-85">Book your next lawn cut through LawnConnect.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" onClick={book} className="rounded-full bg-fresh px-8 font-semibold text-forest hover:bg-fresh/90">Book a Lawn Cut</Button>
                <Button size="lg" variant="outline" onClick={book} className="rounded-full border-forest-foreground/40 bg-transparent px-8 font-semibold text-forest-foreground hover:bg-forest-foreground/10 hover:text-forest-foreground">Join as a Lawn Cutter</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-forest text-forest-foreground">
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <img src={lawnConnectLogo} alt="LawnConnect" className="h-10 w-10 rounded-lg bg-forest-foreground/95 object-contain p-0.5" />
              <span className="text-xl font-extrabold">LawnConnect</span>
            </div>
            <p className="mt-4 max-w-sm opacity-75">Connecting residents with reliable lawn cutters in their communities.</p>
            <p className="mt-4 text-sm opacity-60">officiallawnconnect@gmail.com</p>
            <a href="https://www.instagram.com/lawnconnectjm" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm opacity-75 hover:opacity-100 hover:underline">
              <Instagram className="h-4 w-4" /> @lawnconnectjm
            </a>
          </div>
          <div>
            <p className="mb-4 font-semibold">Explore</p>
            <ul className="space-y-2 text-sm opacity-75">
              {NAV.map((n) => <li key={n.href}><a href={n.href} className="hover:opacity-100 hover:underline">{n.label}</a></li>)}
              <li><Link to="/about" className="hover:underline">About Us</Link></li>
              <li><Link to="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 font-semibold">Customers & Cutters</p>
            <ul className="space-y-2 text-sm opacity-75">
              <li><Link to="/auth" className="hover:underline">Book a Lawn Cut</Link></li>
              <li><Link to="/auth" className="hover:underline">My Account</Link></li>
              <li><Link to="/auth" className="hover:underline">Become a Lawn Cutter</Link></li>
              <li><Link to="/auth" className="hover:underline">Provider Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 font-semibold">Legal</p>
            <ul className="space-y-2 text-sm opacity-75">
              <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:underline">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="hover:underline">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-forest-foreground/10">
          <p className="container mx-auto px-4 py-6 text-center text-sm opacity-60">© {new Date().getFullYear()} LawnConnect. All rights reserved.</p>
        </div>
      </footer>

      <InstallBanner />
    </div>
  );
};

export default Index;
