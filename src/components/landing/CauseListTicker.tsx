import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

const CAUSE_LIST_ROWS = [
  { caseNo: 'CIV/2024/1123', parties: 'Ramesh Kumar Sharma v. Municipal Corp. of Pune', court: '15', fixedFor: 'Arguments' },
  { caseNo: 'ARB/2024/0789', parties: 'Arjun V. Mehta v. Sunrise Developers', court: '22', fixedFor: 'Arbitral Award' },
  { caseNo: 'CRM/2023/0456', parties: 'State of Mah. v. Anil Deshmukh', court: '2', fixedFor: 'Charge Framing' },
  { caseNo: 'NCLT/2024/0234', parties: 'Arjun V. Mehta v. BlueSky Infra Ltd', court: 'NCLT-1', fixedFor: 'Company Petition' },
  { caseNo: 'TAX/2024/0099', parties: 'Kavita Iyer v. DCIT', court: 'SMC', fixedFor: 'Hearing' },
  { caseNo: 'CRM/2024/0320', parties: 'Vikas Choudhary v. State of Mah.', court: '11', fixedFor: 'Bail Application' },
  { caseNo: 'ARB/2024/1100', parties: 'Gurpreet Singh v. Sigma Infrastructure', court: '24', fixedFor: 'Final Arguments' },
  { caseNo: 'CIV/2024/3300', parties: 'Deshmukh Textiles v. Global Fabric Imports', court: '16', fixedFor: 'Injunction' },
  { caseNo: 'TAX/2024/0800', parties: 'Malhotra Steel v. Union of India', court: '32', fixedFor: 'Arguments' },
  { caseNo: 'NCLT/2024/0789', parties: 'Rohan Kapoor v. Peak Capital Partners', court: 'NCLT-2', fixedFor: 'Admission' },
  { caseNo: 'CON/2024/0188', parties: 'Meena Rathore v. Indus Motors', court: '2', fixedFor: 'Notice to OP' },
  { caseNo: 'ARB/2024/0950', parties: 'Bharat Logistics v. FreshMart Retail', court: '25', fixedFor: 'Award Hearing' },
];

export function CauseListTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !listRef.current) return;

    const rows = listRef.current.querySelectorAll('.ticker-row');

    // Stagger in
    gsap.fromTo(
      rows,
      { opacity: 0, x: 20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
        delay: 0.8,
      }
    );

    // Auto-scroll loop
    const totalHeight = listRef.current.scrollHeight / 2;
    const scrollTween = gsap.to(listRef.current, {
      y: -totalHeight,
      duration: 30,
      ease: 'none',
      repeat: -1,
      delay: 2,
    });

    return () => {
      scrollTween.kill();
    };
  }, []);

  // Duplicate rows for seamless loop
  const allRows = [...CAUSE_LIST_ROWS, ...CAUSE_LIST_ROWS];

  return (
    <div
      ref={containerRef}
      className="relative bg-card border border-border rounded-[var(--radius)] shadow-lg overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold font-sans text-sidebar-foreground uppercase tracking-wider">
            Today's Cause List
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-xs font-mono text-primary font-semibold">LIVE</span>
        </div>
      </div>

      {/* Gradient fade top/bottom */}
      <div className="absolute top-[52px] left-0 right-0 h-8 z-10 bg-gradient-to-b from-card to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 z-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />

      {/* Scrolling list */}
      <div className="h-[calc(100%-52px)] overflow-hidden">
        <div ref={listRef} className="pt-2">
          {allRows.map((row, i) => (
            <div
              key={i}
              className={cn(
                'ticker-row flex items-start gap-3 px-4 py-2.5 border-b border-border/50 opacity-0',
                'hover:bg-muted/50 transition-colors cursor-default'
              )}
            >
              <span className="font-mono text-xs text-primary font-medium shrink-0 mt-0.5 w-28 leading-tight">
                {row.caseNo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-sans text-foreground leading-tight line-clamp-1">{row.parties}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground">Ct. {row.court}</span>
                  <span className="text-[10px] font-sans text-muted-foreground/70">·</span>
                  <span className="text-[10px] font-sans text-muted-foreground/70">{row.fixedFor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
