import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Scale, Shield, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CauseListTicker } from '@/components/landing/CauseListTicker';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { WhatsAppSpotlight } from '@/components/landing/WhatsAppSpotlight';

gsap.registerPlugin(ScrollTrigger);

const PAIN_POINTS = [
  {
    icon: '📋',
    title: 'Scattered cause lists across apps and WhatsApp groups',
    desc: "Every morning it's a hunt through PDFs, messages, and registers just to find what's listed today.",
  },
  {
    icon: '📞',
    title: 'Manual client follow-up calls before every hearing',
    desc: 'Calling 10 clients the evening before a busy day is neither scalable nor professional.',
  },
  {
    icon: '📅',
    title: 'Missed hearing dates because no one synced the register',
    desc: "One overlooked update in the register can mean a missed date and an embarrassing court moment.",
  },
];

const TRUST_ITEMS = [
  { icon: Shield, label: 'DPDP Act Compliant', desc: 'Data Principal rights built-in' },
  { icon: Lock, label: 'AES-256 Encrypted', desc: 'All documents at rest' },
  { icon: Zap, label: 'TLS 1.3 in Transit', desc: 'End-to-end secure comms' },
  { icon: Scale, label: 'Built for Indian Advocates', desc: 'Court formats, cause lists, and local workflows' },
];

export function LandingPage() {
  const navRef = useRef<HTMLElement>(null);
  const heroLeftRef = useRef<HTMLDivElement>(null);
  const heroRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const tl = gsap.timeline();

    // Hero text stagger up
    if (heroLeftRef.current) {
      tl.fromTo(
        heroLeftRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'power2.out' }
      );
    }

    // Right panel
    if (heroRightRef.current) {
      tl.fromTo(
        heroRightRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.3'
      );
    }

    // Nav drops in last
    if (navRef.current) {
      tl.fromTo(
        navRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        '-=0.4'
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav ref={navRef} className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-primary flex items-center justify-center">
              <Scale size={14} className="text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-foreground">CaseFlow</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 ml-4">
            <a href="#features" className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors">Product</a>
            <a href="#features" className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors">For Firms</a>
            <a href="#trust" className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5">
                Get Started
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-4rem)]">
        {/* Left */}
        <div ref={heroLeftRef} className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-semibold font-sans border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Trusted by advocates across Maharashtra & beyond
          </div>

          <div className="space-y-4">
            <h1 className="font-serif text-5xl lg:text-6xl font-semibold text-foreground leading-tight tracking-tight">
              Every hearing, tracked.<br />
              <span className="text-primary">Every client, informed.</span>
            </h1>
            <p className="text-xl font-sans text-muted-foreground leading-relaxed max-w-lg">
              The only case management tool that sends WhatsApp + Email hearing reminders automatically — built for how Indian advocates actually work.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Start free
                <ArrowRight size={16} />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                See how it works
              </Button>
            </a>
          </div>

          <p className="text-xs font-sans text-muted-foreground">
            No credit card required. Free for solo advocates up to 50 cases.
          </p>
        </div>

        {/* Right — Cause list ticker */}
        <div
          ref={heroRightRef}
          className="h-[480px] lg:h-[560px] opacity-0"
        >
          <CauseListTicker />
        </div>
      </section>

      {/* Problem strip */}
      <section className="bg-secondary py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-12">
            The daily reality of practice — before CaseFlow
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PAIN_POINTS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card border border-border rounded-[var(--radius)] p-6 shadow-sm"
              >
                <div className="text-3xl mb-4">{p.icon}</div>
                <h3 className="font-sans font-semibold text-foreground text-base mb-2 leading-snug">{p.title}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <div id="features">
        <FeatureShowcase />
      </div>

      {/* WhatsApp spotlight */}
      <WhatsAppSpotlight />

      {/* Trust strip */}
      <section id="trust" className="py-16 px-6 bg-secondary border-y border-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-10">
            Security & Compliance
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {TRUST_ITEMS.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-[var(--radius-sm)] bg-muted flex items-center justify-center">
                  <item.icon size={18} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold font-sans text-foreground">{item.label}</p>
                <p className="text-xs font-sans text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-4xl font-semibold leading-tight">
            Your cause list shouldn't live in a WhatsApp group.
          </h2>
          <p className="font-sans text-primary-foreground/80 text-lg">
            Join advocates who've moved their practice into the 21st century — without changing how courts work.
          </p>
          <Link to="/signup">
            <Button
              size="xl"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold gap-2 mt-4"
            >
              Start for free — no card needed
              <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10 px-6">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="lawCaseflow logo" className="h-7 w-7" />
            <span className="font-serif text-xl font-semibold text-foreground">CaseFlow</span>
          </div>
          <p className="text-xs font-sans text-muted-foreground text-center">
            © 2026 CaseFlow. Built for Indian advocates. DPDP Act compliant.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
