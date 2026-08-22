import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useCases } from '@/store/caseStore';
import { formatDate, cn } from '@/lib/utils';
import type { CalendarView } from '@/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const COURT_COLORS: Record<string, string> = {
  'Bombay High Court': 'bg-chart-2/15 text-chart-2 border-chart-2/20',
  'District Court Pune': 'bg-chart-1/15 text-chart-1 border-chart-1/20',
  'NCLT Mumbai Bench': 'bg-chart-4/15 text-chart-4 border-chart-4/20',
  'Consumer Disputes Redressal Commission Nagpur': 'bg-chart-3/15 text-chart-3 border-chart-3/20',
  'ITAT Mumbai Bench': 'bg-accent text-accent-foreground border-transparent',
  'default': 'bg-muted text-muted-foreground border-transparent',
};

function getCourtColor(courtName: string) {
  return COURT_COLORS[courtName] ?? COURT_COLORS['default'];
}

export function CalendarPage() {
  const { cases } = useCases();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popoverCase, setPopoverCase] = useState<string | null>(null);
  const [courtFilter, setCourtFilter] = useState<string>('all');

  const today = new Date();

  const casesByDate = useMemo(() => {
    const map: Record<string, typeof cases> = {};
    cases.forEach((c) => {
      if (!c.nextDate) return;
      if (courtFilter !== 'all' && c.courtName !== courtFilter) return;
      if (!map[c.nextDate]) map[c.nextDate] = [];
      map[c.nextDate].push(c);
    });
    return map;
  }, [cases, courtFilter]);

  const courts = useMemo(() => [...new Set(cases.map((c) => c.courtName))], [cases]);

  // Month grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 no-print">
            <Printer size={14} /> Print
          </Button>
          <Select value={courtFilter} onValueChange={setCourtFilter}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="All Courts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courts</SelectItem>
              {courts.map((court) => (
                <SelectItem key={court} value={court}>{court}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-[var(--radius-sm)] border border-border overflow-hidden">
            {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-sans capitalize transition-colors',
                  view === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}><ChevronLeft size={14} /></Button>
          <h2 className="font-serif text-lg font-semibold text-foreground w-48 text-center">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}><ChevronRight size={14} /></Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(COURT_COLORS).filter(([k]) => k !== 'default').map(([court, cls]) => (
          <div key={court} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full border', cls)} />
            <span className="text-[10px] font-sans text-muted-foreground">{court.replace('Consumer Disputes Redressal Commission ', 'CDRC ')}</span>
          </div>
        ))}
      </div>

      {/* Month Grid */}
      {view === 'month' && (
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold font-sans text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-muted/20 last:border-r-0" />;
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayCases = casesByDate[dateStr] ?? [];
              const isToday_ = dateStr === today.toISOString().split('T')[0];
              const isSelected = selectedDay?.toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer transition-colors',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    isSelected && 'bg-accent/30',
                    !isSelected && 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                >
                  <div className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-full text-xs font-mono font-medium mb-1',
                    isToday_ ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayCases.slice(0, 2).map((c) => (
                      <Popover key={c.id} open={popoverCase === c.id} onOpenChange={(open) => setPopoverCase(open ? c.id : null)}>
                        <PopoverTrigger asChild>
                          <div
                            className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-sm cursor-pointer truncate border', getCourtColor(c.courtName))}
                            onClick={(e) => { e.stopPropagation(); setPopoverCase(c.id); }}
                          >
                            {c.caseNo}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-2">
                            <p className="font-mono text-xs font-semibold text-primary">{c.caseNo}</p>
                            <p className="text-xs font-sans text-foreground font-medium">{c.firstParty} v. {c.oppositeParty}</p>
                            <div className="text-[10px] font-sans text-muted-foreground space-y-0.5">
                              <p>{c.courtName}</p>
                              <p>Court {c.courtNo} · {c.fixedFor}</p>
                              <p>{formatDate(c.nextDate)}</p>
                            </div>
                            <Link to={`/dashboard/cases/${c.id}`} onClick={() => setPopoverCase(null)}>
                              <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1">Open Case</Button>
                            </Link>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                    {dayCases.length > 2 && (
                      <p className="text-[10px] font-sans text-muted-foreground pl-1">+{dayCases.length - 2} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day/Week placeholder */}
      {view !== 'month' && (
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-12 text-center">
          <p className="text-sm font-sans text-muted-foreground">
            {view === 'day' ? 'Day' : 'Week'} view — switch to Month view for the full calendar.
          </p>
          <Button variant="link" size="sm" onClick={() => setView('month')} className="mt-2">
            Go to Month view
          </Button>
        </div>
      )}

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans font-semibold text-foreground text-sm">
                {selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedDay(null)} aria-label="Close">
                <ChevronLeft size={14} />
              </Button>
            </div>
            {(casesByDate[selectedDay.toISOString().split('T')[0]] ?? []).length === 0 ? (
              <p className="text-sm font-sans text-muted-foreground">No hearings scheduled for this date.</p>
            ) : (
              <div className="space-y-2">
                {(casesByDate[selectedDay.toISOString().split('T')[0]] ?? []).map((c) => (
                  <Link key={c.id} to={`/dashboard/cases/${c.id}`}>
                    <div className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className={cn('h-2 w-2 rounded-full border', getCourtColor(c.courtName))} />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-primary">{c.caseNo}</span>
                        <span className="text-xs font-sans text-foreground ml-2">{c.firstParty} v. {c.oppositeParty}</span>
                      </div>
                      <span className="text-[10px] font-sans text-muted-foreground">{c.fixedFor}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
