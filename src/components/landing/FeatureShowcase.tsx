import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Briefcase, Users, Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    id: 'cases',
    icon: Briefcase,
    title: 'Cases',
    subtitle: 'Master directory of every matter',
    description: 'Track 37 case fields, hearing history, parties, stages, and court identifiers — all in one searchable table.',
    color: 'text-chart-2',
    preview: (
      <div className="space-y-1.5">
        {[
          { no: 'CIV/2024/1123', party: 'Sharma v. Municipal Corp.', status: 'Awaited', date: 'Today' },
          { no: 'ARB/2024/0789', party: 'Mehta v. Sunrise Developers', status: 'Awaited', date: 'Jul 15' },
          { no: 'CRM/2023/0456', party: 'State v. Anil Deshmukh', status: 'Pending', date: 'Jul 17' },
          { no: 'TAX/2024/0099', party: 'Kavita Iyer v. DCIT', status: 'Awaited', date: 'Jul 16' },
        ].map((row) => (
          <div key={row.no} className="flex items-center gap-2 py-1 px-2 rounded-[var(--radius-sm)] hover:bg-muted/50">
            <span className="font-mono text-[10px] text-primary w-24 shrink-0">{row.no}</span>
            <span className="text-xs font-sans text-foreground flex-1 truncate">{row.party}</span>
            <span className={cn('text-[10px] font-sans px-1.5 py-0.5 rounded-full', row.status === 'Awaited' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>{row.status}</span>
            <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">{row.date}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'clients',
    icon: Users,
    title: 'Clients',
    subtitle: 'CRM built for advocates',
    description: 'Manage individuals and companies, track pending fees, link cases, and instantly search by name, phone, or TAN.',
    color: 'text-chart-1',
    preview: (
      <div className="space-y-2">
        {[
          { name: 'Ramesh Kumar Sharma', cases: 3, fees: '₹45,000' },
          { name: 'Rohan Kapoor', cases: 3, fees: '₹1,20,000' },
          { name: 'Deshmukh Textiles Pvt Ltd', cases: 2, fees: '₹2,50,000' },
          { name: 'Nair Constructions LLP', cases: 2, fees: '₹1,75,000' },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-3 py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-muted/50">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-primary">{c.name.charAt(0)}</span>
            </div>
            <span className="text-xs font-sans text-foreground flex-1 truncate">{c.name}</span>
            <span className="text-[10px] font-sans text-muted-foreground">{c.cases} cases</span>
            <span className="font-mono text-[10px] text-chart-3 font-medium">{c.fees}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Calendar',
    subtitle: 'Hearing scheduler that doesn\'t miss a date',
    description: 'Month, week, and day views. Color-coded by court. One-click print for your daily diary. Event popovers link straight to case files.',
    color: 'text-chart-4',
    preview: (
      <div className="grid grid-cols-7 gap-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground pb-1">{d}</div>
        ))}
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const hasEvent = [3, 7, 12, 15, 18, 22, 25, 28].includes(day);
          const isToday = day === 22;
          return (
            <div key={day} className={cn('aspect-square flex flex-col items-center justify-center rounded-[var(--radius-sm)] text-[10px] font-sans cursor-pointer transition-colors', isToday ? 'bg-primary text-primary-foreground font-bold' : hasEvent ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50 text-foreground')}>
              {day}
              {hasEvent && !isToday && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'notify',
    icon: Bell,
    title: 'Notify Engine',
    subtitle: 'Send WhatsApp + Email in one click',
    description: 'Select any set of cases, preview the message, and notify clients about hearing dates — WhatsApp and Email, together.',
    color: 'text-chart-3',
    preview: (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground pb-1 border-b border-border">
          <span>3 cases selected</span>
          <span className="ml-auto text-primary font-medium cursor-pointer hover:underline">Preview message</span>
        </div>
        <div className="bg-muted rounded-[var(--radius-sm)] p-3 text-xs font-sans text-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Hearing Reminder</p>
          <p className="text-muted-foreground text-[11px]">Dear Ramesh Kumar Sharma,<br />Your matter <span className="font-mono text-primary">CIV/2024/1123</span> is listed before <span className="font-semibold">Court No. 15</span> on <span className="font-semibold">22 Aug 2026</span> for <span className="font-semibold">Arguments</span>.<br /><br />— Adv. Nikhil Joshi</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-chart-1/15 text-chart-1 font-sans">✓ WhatsApp</span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-chart-2/15 text-chart-2 font-sans">✓ Email</span>
        </div>
      </div>
    ),
  },
];

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      gsap.fromTo(
        card,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          delay: i * 0.1,
        }
      );
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl font-semibold text-foreground mb-4">
            Every module, purpose-built for court practice
          </h2>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Four tools that actually talk to each other — so you stop copying case numbers between apps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.id}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 space-y-4 opacity-0"
            >
              <div className="flex items-start gap-4">
                <div className={cn('p-2.5 rounded-[var(--radius-sm)] bg-muted', feature.color)}>
                  <feature.icon size={20} />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-foreground text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{feature.subtitle}</p>
                </div>
              </div>
              <p className="text-sm font-sans text-muted-foreground leading-relaxed">{feature.description}</p>
              <div className="bg-background border border-border rounded-[var(--radius-sm)] p-4">
                {feature.preview}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
