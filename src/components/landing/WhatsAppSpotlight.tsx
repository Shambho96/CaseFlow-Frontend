import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CheckCircle } from 'lucide-react';

export function WhatsAppSpotlight() {
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !phoneRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: phoneRef.current,
        start: 'top 80%',
      },
    });

    tl.fromTo(phoneRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' })
      .fromTo('.wa-bubble-1', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '+=0.3')
      .fromTo('.wa-bubble-2', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '+=0.2')
      .fromTo('.wa-bubble-3', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '+=0.2');
  }, []);

  return (
    <section className="py-24 px-6 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-chart-1/10 text-chart-1 px-3 py-1.5 rounded-full text-sm font-semibold font-sans border border-chart-1/20">
              <span className="h-1.5 w-1.5 rounded-full bg-chart-1 animate-pulse" />
              WhatsApp + Email Notify Engine
            </div>
            <h2 className="font-serif text-4xl font-semibold text-foreground leading-tight">
              Stop making phone calls to remind clients about hearings.
            </h2>
            <p className="text-muted-foreground font-sans text-lg leading-relaxed">
              Select cases, preview the message, and send WhatsApp and Email notifications to all linked clients — in under 30 seconds. No third-party app switching required.
            </p>
            <ul className="space-y-3">
              {[
                'Hearing date, court number, and matter stage — auto-filled',
                'Send to multiple clients with a single bulk action',
                'Preview before you send — no surprises',
                'Delivery confirmation in your dashboard',
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-3 font-sans text-sm text-foreground">
                  <CheckCircle size={16} className="text-chart-1 mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — phone frame */}
          <div className="flex justify-center">
            <div
              ref={phoneRef}
              className="relative w-[260px] bg-card rounded-[2rem] border-4 border-border shadow-2xl overflow-hidden opacity-0"
              style={{ height: 480 }}
            >
              {/* Status bar */}
              <div className="bg-chart-1/10 px-4 py-2 flex items-center gap-2 border-b border-chart-1/20">
                <div className="w-7 h-7 rounded-full bg-chart-1/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-chart-1">NJ</span>
                </div>
                <div>
                  <p className="text-xs font-semibold font-sans text-foreground">Adv. Nikhil Joshi</p>
                  <p className="text-[10px] text-muted-foreground font-sans">Firm Notification</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex flex-col gap-2 p-3 pt-4">
                <div className="wa-bubble-1 opacity-0 self-end max-w-[85%] bg-chart-1/15 rounded-[1rem] rounded-tr-sm px-3 py-2 border border-chart-1/20">
                  <p className="text-[11px] font-sans text-foreground font-semibold mb-1">⚖️ Hearing Reminder</p>
                  <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
                    Dear Ramesh Kumar Sharma,<br /><br />
                    Your matter <span className="font-mono text-chart-1 font-semibold">CIV/2024/1123</span> is listed before <strong>Court No. 15, Bombay High Court</strong> on <strong>22 Aug 2026</strong> for <strong>Arguments</strong>.
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className="text-[9px] font-mono text-muted-foreground">9:14 AM</span>
                    <CheckCircle size={10} className="text-chart-1" />
                  </div>
                </div>

                <div className="wa-bubble-2 opacity-0 self-start max-w-[75%] bg-muted rounded-[1rem] rounded-tl-sm px-3 py-2">
                  <p className="text-[10px] font-sans text-foreground">Thank you for the reminder! I'll be there. 🙏</p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-1 text-right">9:21 AM</p>
                </div>

                <div className="wa-bubble-3 opacity-0 self-end max-w-[85%] bg-chart-1/15 rounded-[1rem] rounded-tr-sm px-3 py-2 border border-chart-1/20">
                  <p className="text-[10px] font-sans text-foreground leading-relaxed">
                    Please be present by 10:00 AM. Bring original documents as previously discussed.
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className="text-[9px] font-mono text-muted-foreground">9:22 AM</span>
                    <CheckCircle size={10} className="text-chart-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
