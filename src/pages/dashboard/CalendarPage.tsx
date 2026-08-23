import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, Palette, Plus, X, CalendarDays, Columns3, List, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { useCases } from '@/store/caseStore';
import { useToast } from '@/store/toastStore';
import { useUI } from '@/store/uiStore';
import { applyScope } from '@/lib/scope';
import { formatDate, cn } from '@/lib/utils';
import type { CalendarView, Case } from '@/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const COLOR_KEYS = [
  { key: 'chart-1', label: 'Green' },
  { key: 'chart-2', label: 'Purple' },
  { key: 'chart-3', label: 'Orange' },
  { key: 'chart-4', label: 'Blue' },
  { key: 'accent', label: 'Neutral' },
] as const;

type ColorKey = (typeof COLOR_KEYS)[number]['key'];

const COLOR_CHIP: Record<ColorKey, string> = {
  'chart-1': 'bg-chart-1/15 text-chart-1 border-chart-1/20',
  'chart-2': 'bg-chart-2/15 text-chart-2 border-chart-2/20',
  'chart-3': 'bg-chart-3/15 text-chart-3 border-chart-3/20',
  'chart-4': 'bg-chart-4/15 text-chart-4 border-chart-4/20',
  accent: 'bg-accent text-accent-foreground border-transparent',
};

const COLOR_SWATCH: Record<ColorKey, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  accent: 'bg-muted-foreground',
};

const COLOR_BORDER: Record<ColorKey, string> = {
  'chart-1': 'border-l-chart-1',
  'chart-2': 'border-l-chart-2',
  'chart-3': 'border-l-chart-3',
  'chart-4': 'border-l-chart-4',
  accent: 'border-l-muted-foreground',
};

const DEFAULT_COLOR_RULES: Record<string, string> = {
  'Bombay High Court': 'chart-2',
  'District Court Pune': 'chart-1',
  'NCLT Mumbai Bench': 'chart-4',
  'Consumer Disputes Redressal Commission Nagpur': 'chart-3',
};

function colorKeyOf(courtName: string, rules: Record<string, string>): ColorKey {
  return ((rules[courtName] ?? 'accent') as ColorKey);
}

function dateStrOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarPage() {
  const { cases: allCases } = useCases();
  const { scope } = useUI();
  const { toast } = useToast();
  const cases = useMemo(() => applyScope(allCases, scope), [allCases, scope]);

  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popoverCase, setPopoverCase] = useState<string | null>(null);
  const [courtTypeFilter, setCourtTypeFilter] = useState<string>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [fixedForFilter, setFixedForFilter] = useState<string>('all');
  const [colorManagerOpen, setColorManagerOpen] = useState(false);
  const [colorRules, setColorRules] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('lawcaseflow-color-rules');
      if (raw) return JSON.parse(raw) as Record<string, string>;
    } catch { /* ignore */ }
    return DEFAULT_COLOR_RULES;
  });
  const [newRuleCourt, setNewRuleCourt] = useState('');
  const [newRuleColor, setNewRuleColor] = useState<ColorKey>('chart-1');

  const today = new Date();
  const todayStr = dateStrOf(today);

  const persistRules = (rules: Record<string, string>) => {
    setColorRules(rules);
    localStorage.setItem('lawcaseflow-color-rules', JSON.stringify(rules));
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const courtTypes = useMemo(() => [...new Set(cases.map((c) => c.courtType))], [cases]);
  const courts = useMemo(
    () => [...new Set(cases.filter((c) => courtTypeFilter === 'all' || c.courtType === courtTypeFilter).map((c) => c.courtName))],
    [cases, courtTypeFilter]
  );
  const fixedForOptions = useMemo(() => [...new Set(cases.map((c) => c.fixedFor).filter(Boolean))], [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (!c.nextDate) return false;
      if (c.status === 'Decided' || c.status === 'Abandoned') return false;
      if (courtTypeFilter !== 'all' && c.courtType !== courtTypeFilter) return false;
      if (courtFilter !== 'all' && c.courtName !== courtFilter) return false;
      if (fixedForFilter !== 'all' && c.fixedFor !== fixedForFilter) return false;
      return true;
    });
  }, [cases, courtTypeFilter, courtFilter, fixedForFilter]);

  const casesByDate = useMemo(() => {
    const map: Record<string, Case[]> = {};
    filteredCases.forEach((c) => {
      if (!map[c.nextDate]) map[c.nextDate] = [];
      map[c.nextDate].push(c);
    });
    return map;
  }, [filteredCases]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const navigate = (dir: 1 | -1) => {
    if (view === 'month') setCurrentDate(new Date(year, month + dir, 1));
    else if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + dir * 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + dir);
      setCurrentDate(d);
    }
  };

  const periodLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[month]} ${year}`;
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [view, currentDate, year, month]);

  // ── Month grid: always 6 rows × 7 cols with leading/trailing days ─────────
  type CellDay = { date: Date; inMonth: boolean };
  const monthCells = useMemo<CellDay[]>(() => {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const cellsStart = new Date(first);
    cellsStart.setDate(cellsStart.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(cellsStart);
      d.setDate(d.getDate() + i);
      return { date: d, inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  // Week days (Sun–Sat of current week)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Agenda rail day (defaults to today)
  const railDay = selectedDay ?? today;
  const railStr = dateStrOf(railDay);
  const railCases = casesByDate[railStr] ?? [];
  const dayViewCases = view === 'day' ? (casesByDate[dateStrOf(currentDate)] ?? []) : [];

  // ── Event pill / card renderers ────────────────────────────────────────────
  const EventPill = ({ c }: { c: Case }) => (
    <Popover key={c.id} open={popoverCase === c.id} onOpenChange={(open) => setPopoverCase(open ? c.id : null)}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-1 text-left px-1 py-[3px] rounded-[4px] border-l-2 no-print transition-colors hover:brightness-95',
            COLOR_CHIP[colorKeyOf(c.courtName, colorRules)]
          )}
          onClick={(e) => { e.stopPropagation(); setPopoverCase(c.id); }}
          title={`${c.caseNo} · Ct. ${c.courtNo}`}
        >
          <span className="text-[9.5px] font-mono font-medium truncate">{c.caseNo}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 print:hidden" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <p className="font-mono text-xs font-semibold text-primary">{c.caseNo}</p>
          <p className="text-xs font-sans text-foreground font-medium">{c.firstParty} v. {c.oppositeParty}</p>
          <div className="text-[10px] font-sans text-muted-foreground space-y-0.5">
            <p>{c.courtName}</p>
            <p>Court {c.courtNo || '—'} · {c.fixedFor || '—'}</p>
            <p>{formatDate(c.nextDate)}</p>
          </div>
          <Link to={`/dashboard/cases/${c.id}`} onClick={() => setPopoverCase(null)}>
            <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1">Open Case</Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );

  /** Rich card used in week & day views */
  const HearingCard = ({ c, serial }: { c: Case; serial?: number }) => {
    const ck = colorKeyOf(c.courtName, colorRules);
    return (
      <Popover open={popoverCase === `card-${c.id}`} onOpenChange={(open) => setPopoverCase(open ? `card-${c.id}` : null)}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'w-full flex items-start gap-2 text-left p-2 rounded-[var(--radius-sm)] border border-border bg-card shadow-xs cursor-pointer transition-all hover:shadow-sm hover:border-primary/40 no-print',
              'border-l-[3px]',
              COLOR_BORDER[ck]
            )}
            onClick={(e) => { e.stopPropagation(); setPopoverCase(`card-${c.id}`); }}
          >
            {serial !== undefined && (
              <span className="h-5 w-5 shrink-0 rounded-full bg-muted text-muted-foreground font-mono text-[9px] font-bold flex items-center justify-center">
                {serial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10.5px] font-semibold text-primary truncate">{c.caseNo}</p>
              <p className="text-[10px] font-sans text-foreground truncate">{c.firstParty} v. {c.oppositeParty}</p>
              <p className="text-[9px] font-sans text-muted-foreground truncate">Ct. {c.courtNo || '—'} · {c.fixedFor || '—'}</p>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 print:hidden" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <p className="font-mono text-xs font-semibold text-primary">{c.caseNo}</p>
            <p className="text-xs font-sans text-foreground font-medium">{c.firstParty} v. {c.oppositeParty}</p>
            <div className="text-[10px] font-sans text-muted-foreground space-y-0.5">
              <p>{c.courtName}</p>
              <p>Court {c.courtNo || '—'} · {c.fixedFor || '—'}</p>
              <p>{formatDate(c.nextDate)}</p>
            </div>
            <Link to={`/dashboard/cases/${c.id}`} onClick={() => setPopoverCase(null)}>
              <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1">Open Case</Button>
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Print heading shown only in print output
  const printHeading = (
    <div className="hidden print:block mb-4">
      <p className="font-serif text-base font-semibold">
        Cause List — {periodLabel} ({view} view)
      </p>
      <p className="text-xs">Generated {today.toLocaleDateString('en-IN')} · {filteredCases.length} matters</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-end justify-between gap-3 flex-wrap no-print">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setColorManagerOpen(true)} className="gap-1.5 h-8">
            <Palette size={14} /> Color Codes
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-8">
            <Printer size={14} /> Print
          </Button>
          <Select value={courtTypeFilter} onValueChange={(v) => { setCourtTypeFilter(v); setCourtFilter('all'); }}>
            <SelectTrigger className="h-8 w-38 text-xs w-[9.5rem]">
              <SelectValue placeholder="All Court Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Court Types</SelectItem>
              {courtTypes.map((ct) => (<SelectItem key={ct} value={ct}>{ct}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={courtFilter} onValueChange={setCourtFilter}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Courts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courts</SelectItem>
              {courts.map((court) => (<SelectItem key={court} value={court}>{court}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={fixedForFilter} onValueChange={setFixedForFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {fixedForOptions.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Nav bar — like a real calendar header */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => { setCurrentDate(new Date()); setSelectedDay(null); }}>Today</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)} aria-label="Next"><ChevronRight size={16} /></Button>
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground ml-1 min-w-52">{periodLabel}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 flex-wrap">
            {Object.entries(colorRules).slice(0, 4).map(([court, colorKey]) => (
              <div key={court} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', COLOR_SWATCH[colorKey as ColorKey] ?? COLOR_SWATCH.accent)} />
                <span className="text-[10px] font-sans text-muted-foreground">{court.replace('Consumer Disputes Redressal Commission ', 'CDRC ').replace('District Court ', 'Dist. ')}</span>
              </div>
            ))}
            {Object.keys(colorRules).length > 4 && (
              <button onClick={() => setColorManagerOpen(true)} className="text-[10px] font-sans text-primary hover:underline">+{Object.keys(colorRules).length - 4} more</button>
            )}
          </div>
          {/* View switch */}
          <div className="flex rounded-[var(--radius-sm)] border border-border overflow-hidden bg-card">
            {([
              ['month', 'Month', CalendarDays],
              ['week', 'Week', Columns3],
              ['day', 'Day', List],
            ] as [CalendarView, string, React.ElementType][]).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-sans transition-colors flex items-center gap-1.5',
                  view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {printHeading}

      {/* Main area: calendar + agenda rail */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_310px] gap-5 items-start">

        {/* ── Calendar surface ── */}
        <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-sm overflow-hidden print:shadow-none">

          {/* MONTH VIEW */}
          {view === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-px bg-border border-b border-border">
                {DAYS.map((d) => (
                  <div key={d} className="bg-card py-2 text-center text-[11px] font-semibold font-sans text-muted-foreground uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border">
                {monthCells.map(({ date, inMonth }, i) => {
                  const ds = dateStrOf(date);
                  const isToday_ = ds === todayStr;
                  const isSelected = !!selectedDay && dateStrOf(selectedDay) === ds;
                  const dayCases = casesByDate[ds] ?? [];
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDay(date)}
                      className={cn(
                        'min-h-[96px] xl:min-h-[108px] bg-card p-1.5 cursor-pointer transition-colors group relative',
                        !inMonth && 'bg-muted/30',
                        isSelected && 'bg-accent/40',
                        isToday_ && 'ring-1 ring-inset ring-primary/40'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          'h-6 min-w-6 px-1 inline-flex items-center justify-center rounded-full text-[11px] font-mono font-medium',
                          isToday_
                            ? 'bg-primary text-primary-foreground font-bold'
                            : inMonth ? 'text-foreground group-hover:bg-muted' : 'text-muted-foreground/50'
                        )}>
                          {date.getDate()}
                        </span>
                        {dayCases.length > 0 && inMonth && (
                          <span className="text-[8.5px] font-mono text-muted-foreground">{dayCases.length}</span>
                        )}
                      </div>
                      <div className="space-y-[3px]">
                        {dayCases.slice(0, 2).map((c) => <EventPill key={c.id} c={c} />)}
                        {dayCases.length > 2 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDay(date); }}
                            className="text-[9px] font-sans text-primary hover:underline pl-0.5"
                          >
                            +{dayCases.length - 2} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-px bg-border border-b border-border">
                {weekDays.map((d) => {
                  const ds = dateStrOf(d);
                  const isToday_ = ds === todayStr;
                  return (
                    <div key={ds} className={cn('bg-card py-2.5 text-center', isToday_ && 'bg-accent/30')}>
                      <p className="text-[9.5px] font-sans text-muted-foreground uppercase tracking-wide">{DAYS[d.getDay()]}</p>
                      <div className={cn(
                        'mx-auto mt-1 h-7 w-7 flex items-center justify-center rounded-full text-xs font-mono font-semibold',
                        isToday_ ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      )}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border">
                {weekDays.map((d) => {
                  const ds = dateStrOf(d);
                  const dayCases = casesByDate[ds] ?? [];
                  const isToday_ = ds === todayStr;
                  return (
                    <div key={ds} className={cn('min-h-[380px] bg-card p-1.5 space-y-1.5', isToday_ && 'bg-accent/20')} onClick={() => setSelectedDay(d)}>
                      {dayCases.length === 0 ? (
                        <div className="h-full min-h-[340px] flex items-center justify-center">
                          <p className="text-[9px] font-sans text-muted-foreground/50">—</p>
                        </div>
                      ) : dayCases.slice(0, 6).map((c) => <HearingCard key={c.id} c={c} />)}
                      {dayCases.length > 6 && (
                        <button onClick={() => { setCurrentDate(d); setView('day'); }} className="w-full text-[9px] font-sans text-primary hover:underline pt-1">
                          +{dayCases.length - 6} more →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* DAY VIEW — cause-list style board */}
          {view === 'day' && (() => {
            const d = currentDate;
            const isToday_ = dateStrOf(d) === todayStr;
            return (
              <>
                <div className={cn('flex items-center justify-between px-5 py-3.5 border-b border-border', isToday_ && 'bg-accent/25')}>
                  <div>
                    <p className="text-[10px] font-sans text-muted-foreground uppercase tracking-wide">{DAYS[d.getDay()]}{isToday_ ? ' · Today' : ''}</p>
                    <p className="font-serif text-base font-semibold text-foreground">{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <Badge variant={dayViewCases.length > 0 ? 'default' : 'muted'} className="font-mono text-[10px]">
                    {dayViewCases.length} matter{dayViewCases.length === 1 ? '' : 's'} listed
                  </Badge>
                </div>
                <div className="p-4 min-h-[400px]">
                  {dayViewCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Inbox size={28} className="text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-sans text-muted-foreground">No matters listed for this date.</p>
                      <p className="text-xs font-sans text-muted-foreground/70 mt-1">Use ‹ › to browse other days.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-3">Cause List · Item Order</p>
                      <div className="space-y-2 max-w-3xl mx-auto">
                        {dayViewCases.map((c, idx) => (
                          <div key={c.id} className="print:block">
                            <HearingCard c={c} serial={idx + 1} />
                          </div>
                        ))}
                      </div>
                      {/* Print-only flat list */}
                      <div className="hidden print:block mt-4">
                        {dayViewCases.map((c, idx) => (
                          <div key={`p-${c.id}`} className="flex items-start gap-2 py-1.5 border-b border-neutral-200">
                            <span className="font-mono text-xs w-6">{idx + 1}.</span>
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold">{c.caseNo} <span className="font-sans font-normal">· Ct. {c.courtNo} · {c.fixedFor}</span></p>
                              <p className="text-xs">{c.firstParty} v. {c.oppositeParty} — {c.courtName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* ── Agenda rail ── */}
        <aside className="space-y-4 xl:sticky xl:top-20 no-print">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
            <div className={cn('px-4 py-3 border-b border-border', railStr === todayStr && 'bg-accent/25')}>
              <p className="text-[10px] font-sans text-muted-foreground uppercase tracking-wide">
                {railStr === todayStr ? "Today's Agenda" : 'Day Agenda'}
              </p>
              <p className="font-sans font-semibold text-foreground text-sm mt-0.5">
                {railDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="mt-1 text-[10px] font-sans text-primary hover:underline">
                  Jump back to today
                </button>
              )}
            </div>
            <div className="p-3 max-h-[430px] overflow-y-auto">
              {railCases.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CalendarDays size={22} className="text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-sans text-muted-foreground">No hearings scheduled.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {railCases.map((c, idx) => (
                    <Link key={c.id} to={`/dashboard/cases/${c.id}`}>
                      <div className="flex items-start gap-2.5 p-2 rounded-[var(--radius-sm)] border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                        <span className="h-6 w-6 shrink-0 rounded-full bg-muted text-muted-foreground font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] text-primary truncate">{c.caseNo}</p>
                          <p className="text-[10px] font-sans text-foreground truncate">{c.firstParty} v. {c.oppositeParty}</p>
                          <p className="text-[9px] font-sans text-muted-foreground truncate">Ct. {c.courtNo || '—'} · {c.fixedFor || '—'} · {c.courtName}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {railCases.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] font-sans text-muted-foreground">{railCases.length} listed</span>
                <Link to="/dashboard/cases" className="text-[10px] font-sans text-primary hover:underline">View all cases</Link>
              </div>
            )}
          </div>

          {/* Scope hint */}
          {scope.kind !== 'all' && (
            <div className="bg-accent/40 border border-border rounded-[var(--radius)] p-3.5">
              <p className="text-[11px] font-sans text-accent-foreground leading-relaxed">
                Showing hearings for the active navbar scope. Change it from the topbar switcher.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Color Code Manager */}
      <Dialog open={colorManagerOpen} onOpenChange={setColorManagerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Color Codes</DialogTitle>
            <DialogDescription>Assign colors to courts to color-code calendar entries.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            {Object.keys(colorRules).length === 0 && (
              <p className="text-xs font-sans text-muted-foreground">No color codes yet. Add one below.</p>
            )}
            {Object.entries(colorRules).map(([court, colorKey]) => (
              <div key={court} className="flex items-center gap-2 py-1.5 px-2.5 bg-muted/40 rounded-[var(--radius-sm)] border border-border">
                <span className={cn('h-3 w-3 rounded-full shrink-0', COLOR_SWATCH[colorKey as ColorKey] ?? COLOR_SWATCH.accent)} />
                <span className="text-xs font-sans text-foreground flex-1 truncate">{court}</span>
                <Select value={colorKey} onValueChange={(v) => persistRules({ ...colorRules, [court]: v })}>
                  <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_KEYS.map((ck) => (
                      <SelectItem key={ck.key} value={ck.key}>{ck.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => {
                    const next = { ...colorRules };
                    delete next[court];
                    persistRules(next);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${court}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-xs">Add / Update Rule</Label>
            <Select value={newRuleCourt} onValueChange={setNewRuleCourt}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select court…" /></SelectTrigger>
              <SelectContent>
                {[...new Set(cases.map((c) => c.courtName))].map((court) => (
                  <SelectItem key={court} value={court}>{court}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {COLOR_KEYS.map((ck) => (
                <button
                  key={ck.key}
                  onClick={() => setNewRuleColor(ck.key)}
                  aria-label={ck.label}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform',
                    COLOR_SWATCH[ck.key],
                    newRuleColor === ck.key ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                />
              ))}
            </div>
            <Button
              size="sm"
              disabled={!newRuleCourt}
              onClick={() => {
                persistRules({ ...colorRules, [newRuleCourt]: newRuleColor });
                toast(`Color code saved for ${newRuleCourt}.`);
                setNewRuleCourt('');
              }}
              className="gap-1.5"
            >
              <Plus size={13} /> Save Rule
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColorManagerOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
