import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, ComposedChart, Legend
} from 'recharts';
import {
  Briefcase, Calendar as CalendarIcon, Clock, CheckCircle, Gavel,
  Upload, Download, LayoutList, FileSpreadsheet,
  TrendingUp, Layers, Building2, Users, ArrowUpRight, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCases } from '@/store/caseStore';
import { useToast } from '@/store/toastStore';
import { isToday, isTomorrow, cn } from '@/lib/utils';
import { parseCsv, exportCsv } from '@/lib/exporters';
import { advocates } from '@/mocks/advocates';
import type { Case, CaseCategory } from '@/types';

const C = {
  green: 'oklch(0.7459 0.1483 156.4499)',
  purple: 'oklch(0.5393 0.2713 286.7462)',
  orange: 'oklch(0.7336 0.1758 50.5517)',
  blue: 'oklch(0.5828 0.1809 259.7276)',
  gray: 'oklch(0.5590 0 0)',
};

type TrendRange = '6m' | '12m' | 'all' | 'custom';

const CHART_TOOLTIP = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
  to,
  onClick,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subtitle?: string;
  accentColor: string;
  to?: string;
  onClick?: () => void;
  delay?: number;
}) {
  const inner = (
    <Card className="relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group h-full">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accentColor }} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center mb-2.5" style={{ background: `${accentColor}1f` }}>
            <Icon size={16} style={{ color: accentColor }} />
          </div>
          <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="font-mono text-[26px] leading-none font-semibold text-foreground">{value}</div>
        <div className="text-xs font-sans font-medium text-foreground mt-1.5">{label}</div>
        {subtitle && <div className="text-[10px] font-sans text-muted-foreground mt-0.5">{subtitle}</div>}
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {to ? (
        <Link to={to} onClick={onClick}>{inner}</Link>
      ) : (
        <div onClick={onClick}>{inner}</div>
      )}
    </motion.div>
  );
}

// ── Section card header ──────────────────────────────────────────────────────

function ChartCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-1 pt-4 px-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-sans flex items-center gap-2 text-foreground">
            <span className="h-6 w-6 rounded-[var(--radius-sm)] bg-primary/10 flex items-center justify-center">
              <Icon size={13} className="text-primary" />
            </span>
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-40 text-center px-6">
      <Inbox size={24} className="text-muted-foreground/40 mb-2" />
      <p className="text-xs font-sans text-muted-foreground">{message}</p>
    </div>
  );
}

interface ImportRowIssue { row: number; message: string }

export function CommandCenter() {
  const { scopedCases, addCases, setFilters } = useCases();
  const all = scopedCases;
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<CaseCategory | 'all'>('all');
  const [trendRange, setTrendRange] = useState<TrendRange>('6m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [dailyBoardOpen, setDailyBoardOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<Partial<Case>[]>([]);
  const [rowIssues, setRowIssues] = useState<ImportRowIssue[]>([]);

  // Master filter chain: scope → category
  const cases = useMemo(
    () => (categoryFilter === 'all' ? all : all.filter((c) => c.category === categoryFilter)),
    [all, categoryFilter]
  );

  const categories = useMemo(() => [...new Set(all.map((c) => c.category))], [all]);

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: cases.length,
    today: cases.filter((c) => isToday(c.nextDate)).length,
    tomorrow: cases.filter((c) => isTomorrow(c.nextDate)).length,
    awaited: cases.filter((c) => c.status === 'Awaited').length,
    decided: cases.filter((c) => c.status === 'Decided').length,
    activePending: cases.filter((c) => c.status === 'Pending').length,
  }), [cases]);

  const monthContext = useMemo(() => {
    const now = new Date();
    const key = (d: Date) => d.toISOString().split('T')[0].slice(0, 7);
    const thisMonth = key(now);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = key(last);
    return {
      filedThisMonth: cases.filter((c) => c.filedDate.startsWith(thisMonth)).length,
      filedLastMonth: cases.filter((c) => c.filedDate.startsWith(lastMonth)).length,
      decidedThisMonth: cases.filter((c) => (c.decidedDate ?? '').startsWith(thisMonth)).length,
      decidedLastMonth: cases.filter((c) => (c.decidedDate ?? '').startsWith(lastMonth)).length,
    };
  }, [cases]);

  // ── Filed vs Decided trend (monthly buckets — always shows data) ──────────
  const trendData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let from: Date;
    let to: Date = now;
    if (trendRange === 'custom' && customFrom && customTo) {
      from = new Date(customFrom + 'T00:00:00');
      to = new Date(customTo + 'T23:59:59');
    } else if (trendRange === 'all') {
      const minFiled = cases.reduce<string>((min, c) => (c.filedDate && c.filedDate < min ? c.filedDate : min), todayStr);
      from = new Date(minFiled + 'T00:00:00');
    } else {
      const monthsBack = trendRange === '6m' ? 6 : 12;
      from = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    }

    // One bucket per calendar month between `from` and `to`
    const buckets: { key: string; label: string; filed: number; decided: number }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to && buckets.length < 60) {
      buckets.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        label: cursor.toLocaleDateString('en-IN', { month: 'short' }),
        filed: 0,
        decided: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (buckets.length > 0) buckets[0].label += ` '${String(from.getFullYear()).slice(2)}`;

    const bucketIndex = (dateStr?: string) => {
      if (!dateStr) return -1;
      return buckets.findIndex((b) => b.key === dateStr.slice(0, 7));
    };
    cases.forEach((c) => {
      const fi = bucketIndex(c.filedDate);
      if (fi >= 0) buckets[fi].filed++;
      const di = bucketIndex(c.decidedDate);
      if (di >= 0) buckets[di].decided++;
    });
    // Drop leading/trailing fully-empty buckets for a tighter chart
    let first = buckets.findIndex((b) => b.filed > 0 || b.decided > 0);
    if (first === -1) first = 0;
    const lastRev = [...buckets].reverse().findIndex((b) => b.filed > 0 || b.decided > 0);
    const last = lastRev === -1 ? buckets.length - 1 : buckets.length - 1 - lastRev;
    return buckets.slice(first, last + 1);
  }, [cases, trendRange, customFrom, customTo]);
  const trendEmpty = trendData.every((d) => d.filed === 0 && d.decided === 0);

  // ── Status donut ───────────────────────────────────────────────────────────
  const statusData = useMemo(() => ([
    { name: 'Pending', value: cases.filter((c) => c.status === 'Pending').length, color: C.blue },
    { name: 'Awaited', value: cases.filter((c) => c.status === 'Awaited').length, color: C.orange },
    { name: 'Decided', value: cases.filter((c) => c.status === 'Decided').length, color: C.green },
    { name: 'Abandoned', value: cases.filter((c) => c.status === 'Abandoned').length, color: C.gray },
  ]).filter((d) => d.value > 0), [cases]);

  // ── Purpose (horizontal bars) ──────────────────────────────────────────────
  const purposeData = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => { map[c.fixedFor || 'Unassigned'] = (map[c.fixedFor || 'Unassigned'] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 16 ? name.slice(0, 15) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [cases]);

  // ── Pending cases by months (since filing) ─────────────────────────────────
  const ageData = useMemo(() => {
    const now = new Date();
    const MONTH_MS = 30.44 * 24 * 3600 * 1000;
    const monthsOf = (c: Case) => (now.getTime() - new Date(c.filedDate).getTime()) / MONTH_MS;
    return [
      { name: '0–3 mo', value: cases.filter((c) => c.filedDate && monthsOf(c) < 3).length, fill: C.green },
      { name: '3–6 mo', value: cases.filter((c) => { const m = monthsOf(c); return m >= 3 && m < 6; }).length, fill: C.blue },
      { name: '6–9 mo', value: cases.filter((c) => { const m = monthsOf(c); return m >= 6 && m < 9; }).length, fill: C.purple },
      { name: '9–12 mo', value: cases.filter((c) => { const m = monthsOf(c); return m >= 9 && m < 12; }).length, fill: C.orange },
      { name: '12+ mo', value: cases.filter((c) => c.filedDate && monthsOf(c) >= 12).length, fill: 'oklch(0.6290 0.1902 23.0704)' },
    ];
  }, [cases]);

  // ── Court-wise load ────────────────────────────────────────────────────────
  const courtLoad = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      const k = c.courtName.length > 22 ? c.courtName.slice(0, 21) + '…' : c.courtName;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [cases]);

  // ── Advocate workload ──────────────────────────────────────────────────────
  const workload = useMemo(() => (
    advocates.map((a) => ({
      name: a.name.replace('Adv. ', ''),
      value: cases.filter((c) => c.advocateIds.includes(a.id)).length,
    })).sort((a, b) => b.value - a.value)
  ), [cases]);

  // ── Upcoming hearings (next 7 days) ────────────────────────────────────────
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + 8);
    return cases
      .filter((c) => {
        if (!c.nextDate || c.status === 'Decided' || c.status === 'Abandoned') return false;
        const nd = new Date(c.nextDate + 'T00:00:00');
        return nd >= today && nd < end;
      })
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  }, [cases]);

  const todayCases = cases.filter((c) => isToday(c.nextDate));

  // Mini calendar data for current month
  const miniCal = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const hearingDays = new Set(
      cases.map((c) => c.nextDate).filter(Boolean).filter((d) => d.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`))
    );
    const todayStr = now.toISOString().split('T')[0];
    return { cells, hearingDays, todayStr, monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }, [cases]);

  const DAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // ── Import handlers ────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast('Unsupported file type. Please upload CSV or XLSX.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''));
      if (rows.length < 2) {
        toast('The file appears to be empty or has no data rows.', 'error');
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
      const iCaseNo = idx('case no', 'caseno', 'case number');
      const iFirst = idx('first party', 'petitioner', 'plaintiff');
      const iOpp = idx('opposite party', 'respondent', 'defendant');
      const iCourt = idx('court name', 'court');
      const iNext = idx('next date', 'nextdate', 'hearing date');
      const iStatus = idx('status');
      if (iCaseNo === -1 || iFirst === -1) {
        toast('Missing required columns: "Case No." and "First Party". Download the template.', 'error');
        return;
      }
      const issues: ImportRowIssue[] = [];
      const out: Partial<Case>[] = [];
      rows.slice(1).forEach((r, i) => {
        const caseNo = r[iCaseNo]?.trim() ?? '';
        const firstParty = r[iFirst]?.trim() ?? '';
        if (!caseNo && !firstParty) return;
        if (!caseNo) issues.push({ row: i + 2, message: 'Missing Case No.' });
        if (!firstParty) issues.push({ row: i + 2, message: 'Missing First Party' });
        const statusRaw = (iStatus !== -1 ? r[iStatus]?.trim().toLowerCase() : '') || '';
        const status = ['awaited', 'pending', 'decided', 'abandoned'].includes(statusRaw)
          ? (statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) as Case['status'])
          : 'Pending';
        out.push({
          caseNo: caseNo || '(unnumbered)',
          firstParty: firstParty || '—',
          oppositeParty: iOpp !== -1 ? r[iOpp]?.trim() : '',
          courtName: iCourt !== -1 ? r[iCourt]?.trim() : '',
          nextDate: iNext !== -1 && r[iNext] ? r[iNext].trim() : '',
          status,
        });
      });
      if (out.length === 0) { toast('No valid data rows found in the file.', 'error'); return; }
      setParsedRows(out);
      setRowIssues(issues.slice(0, 10));
      toast(`Parsed ${out.length} row(s). Review and confirm the import.`);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const stamp = Date.now();
    addCases(parsedRows.map((r, i) => ({
      id: `case-import-${stamp}-${i}`,
      caseNo: r.caseNo!,
      category: categoryFilter === 'all' ? 'Civil' : categoryFilter,
      status: r.status ?? 'Pending',
      courtType: 'District Court',
      courtName: r.courtName || 'Unassigned Court',
      courtNo: '',
      firstParty: r.firstParty!,
      oppositeParty: r.oppositeParty || '—',
      fixedFor: '',
      prevDate: '',
      nextDate: r.nextDate || '',
      filedDate: new Date().toISOString().split('T')[0],
      stage: '',
      clientIds: [],
      advocateIds: [],
    })) as Case[]);
    setImportOpen(false);
    toast(`${parsedRows.length} case(s) imported successfully.`);
    setParsedRows([]);
    setRowIssues([]);
  };

  const downloadTemplate = () => {
    exportCsv(
      'caseflow-import-template.csv',
      ['Case No.', 'First Party', 'Opposite Party', 'Court Name', 'Next Date', 'Status'],
      [
        ['CIV/2026/0101', 'Ramesh Kumar Sharma', 'Sunil Pawar', 'District Court Pune', new Date().toISOString().split('T')[0], 'Pending'],
        ['CRI/2026/0042', 'State of Maharashtra', 'Anil Deshmukh', 'Bombay High Court', '', 'Awaited'],
      ]
    );
    toast('Template downloaded.');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Command Center</h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter — scopes every widget below */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
                <Layers size={13} />
                {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter analytics by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter('all')}>All Categories</DropdownMenuItem>
              {categories.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>{cat}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => { setParsedRows([]); setRowIssues([]); setImportOpen(true); }} className="gap-1.5 h-8">
            <Upload size={14} /> Import
          </Button>
          <Button size="sm" onClick={() => setDailyBoardOpen(true)} className="gap-1.5 h-8">
            <LayoutList size={14} /> Get Daily Board
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Briefcase}
          label="All Cases"
          value={stats.total}
          subtitle={`+${monthContext.filedThisMonth} added this month`}
          accentColor={C.purple}
          to="/dashboard/cases"
          onClick={() => setFilters({ status: undefined, dateScope: undefined })}
          delay={0}
        />
        <KpiCard
          icon={CalendarIcon}
          label="Listed Today"
          value={stats.today}
          subtitle={`${todayCases.length ? 'hearings before you now' : 'clear board today'}`}
          accentColor={C.orange}
          to="/dashboard/cases"
          onClick={() => setFilters({ status: undefined, dateScope: 'today' })}
          delay={0.05}
        />
        <KpiCard
          icon={Clock}
          label="Tomorrow's Board"
          value={stats.tomorrow}
          subtitle="matters listed next day"
          accentColor={C.blue}
          to="/dashboard/cases"
          onClick={() => setFilters({ status: undefined, dateScope: 'tomorrow' })}
          delay={0.1}
        />
        <KpiCard
          icon={Gavel}
          label="Awaited Dates"
          value={stats.awaited}
          subtitle={`${Math.round((stats.total ? stats.awaited / stats.total : 0) * 100)}% of total`}
          accentColor={C.gray}
          to="/dashboard/cases?status=Awaited"
          onClick={() => setFilters({ status: 'Awaited', dateScope: undefined })}
          delay={0.15}
        />
        <KpiCard
          icon={CheckCircle}
          label="Decided"
          value={stats.decided}
          subtitle={`${monthContext.decidedThisMonth} this month · ${monthContext.decidedLastMonth} last mo.`}
          accentColor={C.green}
          to="/dashboard/cases?status=Decided"
          onClick={() => setFilters({ status: 'Decided', dateScope: undefined })}
          delay={0.2}
        />
      </div>

      {/* Row: trend + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Filed vs Decided" icon={TrendingUp} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex rounded-[var(--radius-sm)] border border-border overflow-hidden">
              {([
                ['6m', 'Last 6 Months'],
                ['12m', 'Last 12 Months'],
                ['all', 'All Time'],
                ['custom', 'Custom'],
              ] as [TrendRange, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTrendRange(key)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-sans transition-colors',
                    trendRange === key ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {trendRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-7 w-36 text-xs font-mono" />
                <span className="text-xs text-muted-foreground">→</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-7 w-36 text-xs font-mono" />
              </div>
            )}
          </div>
          {trendEmpty ? (
            <EmptyChart message="No filings or decisions found — try All Time or a wider custom range." />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={trendData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={trendData.length > 14 ? Math.ceil(trendData.length / 14) - 1 : 0}
                />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-sans)', fontSize: 11 }} iconType="circle" iconSize={7} />
                <Bar dataKey="filed" name="Filed" fill={C.purple} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="decided" name="Decided" fill={C.green} radius={[4, 4, 0, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status Mix" icon={Layers}>
          {statusData.length === 0 ? (
            <EmptyChart message="No cases in current scope." />
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="46%" innerRadius={56} outerRadius={82} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                  <span className="font-mono text-xl font-semibold text-foreground">{stats.total}</span>
                  <span className="text-[10px] font-sans text-muted-foreground">total</span>
                </div>
              </div>
              <div className="space-y-1 mt-1">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] font-sans text-muted-foreground flex-1">{d.name}</span>
                    <span className="font-mono text-[11px] text-foreground">{d.value}</span>
                    <span className="font-mono text-[10px] text-muted-foreground w-9 text-right">
                      {Math.round((d.value / Math.max(stats.total, 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Row: purpose / aging / court load */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Cases by Purpose (Fixed For)" icon={Gavel}>
          {purposeData.length === 0 ? <EmptyChart message="No stages recorded yet." /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={purposeData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontFamily: 'var(--font-sans)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                <Bar dataKey="value" fill={C.purple} radius={[0, 5, 5, 0]} barSize={16}>
                  {purposeData.map((_, i) => (
                    <Cell key={i} fillOpacity={1 - i * 0.13} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Pending Cases by Months" icon={Clock}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-sans)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={26}>
                {ageData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Court-wise Caseload" icon={Building2}>
          {courtLoad.length === 0 ? <EmptyChart message="No courts in current scope." /> : (
            <>
              <div className="space-y-2.5 mt-1">
                {courtLoad.map((d, i) => {
                  const max = courtLoad[0]?.value || 1;
                  const pct = Math.round((d.value / max) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-sans text-foreground truncate pr-2">{d.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">{d.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.06 }}
                          className="h-full rounded-full"
                          style={{ background: [C.purple, C.blue, C.green, C.orange, C.gray][i % 5] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Row: advocate workload + mini calendar/agenda + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Advocate Workload" icon={Users}>
          {workload.every((w) => w.value === 0) ? <EmptyChart message="No case assignments yet." /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workload} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={104} tick={{ fontFamily: 'var(--font-sans)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                <Bar dataKey="value" name="Cases" fill={C.blue} radius={[0, 5, 5, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Mini calendar & agenda */}
        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <span className="h-6 w-6 rounded-[var(--radius-sm)] bg-primary/10 flex items-center justify-center">
                <CalendarIcon size={13} className="text-primary" />
              </span>
              {miniCal.monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_MINI.map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-sans text-muted-foreground py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {miniCal.cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const hasHearing = miniCal.hearingDays.has(dateStr);
                  const isToday_ = dateStr === miniCal.todayStr;
                  return (
                    <Link key={day} to="/dashboard/calendar" className="flex justify-center">
                      <span className={cn(
                        'relative h-6 w-6 flex items-center justify-center rounded-full text-[10px] font-mono transition-colors',
                        isToday_ ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-muted',
                        hasHearing && !isToday_ && 'text-primary'
                      )}>
                        {day}
                        {hasHearing && !isToday_ && (
                          <span className="absolute bottom-0 h-1 w-1 rounded-full bg-chart-3" />
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-border pt-2.5">
              <p className="text-[11px] font-sans font-semibold text-foreground mb-1.5">Today's Agenda</p>
              {todayCases.length === 0 ? (
                <p className="text-[11px] font-sans text-muted-foreground">No events scheduled.</p>
              ) : (
                <div className="space-y-1.5">
                  {todayCases.slice(0, 3).map((c) => (
                    <Link key={c.id} to={`/dashboard/cases/${c.id}`} className="block hover:bg-muted/40 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors">
                      <p className="font-mono text-[10px] text-primary leading-tight">{c.caseNo}</p>
                      <p className="text-[10px] font-sans text-muted-foreground truncate">Ct. {c.courtNo} · {c.fixedFor}</p>
                    </Link>
                  ))}
                  {todayCases.length > 3 && (
                    <Link to="/dashboard/calendar" className="text-[10px] font-sans text-primary hover:underline block">
                      View all ({todayCases.length})
                    </Link>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming hearings */}
        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <span className="h-6 w-6 rounded-[var(--radius-sm)] bg-chart-3/15 flex items-center justify-center">
                <CalendarIcon size={13} className="text-chart-3" />
              </span>
              Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {upcoming.length === 0 ? (
              <EmptyChart message="No hearings in the coming week." />
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-border">
                {upcoming.slice(0, 8).map((c) => {
                  const nd = new Date(c.nextDate + 'T00:00:00');
                  const diff = Math.round((nd.getTime() - new Date(new Date().toISOString().split('T')[0] + 'T00:00:00').getTime()) / 86400000);
                  return (
                    <Link key={c.id} to={`/dashboard/cases/${c.id}`} className="flex items-center gap-2.5 py-2 px-2 hover:bg-muted/40 rounded-[var(--radius-sm)] transition-colors">
                      <div className={cn(
                        'h-8 w-8 rounded-[var(--radius-sm)] flex flex-col items-center justify-center shrink-0',
                        diff === 0 ? 'bg-primary text-primary-foreground' : diff <= 2 ? 'bg-chart-3/15 text-chart-3' : 'bg-muted text-muted-foreground'
                      )}>
                        <span className="font-mono text-[11px] font-bold leading-none">{nd.getDate()}</span>
                        <span className="text-[8px] uppercase leading-tight">{nd.toLocaleDateString('en-IN', { month: 'short' })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-primary truncate">{c.caseNo}</p>
                        <p className="text-[10px] font-sans text-muted-foreground truncate">{c.firstParty} v. {c.oppositeParty}</p>
                      </div>
                      <Badge variant={diff === 0 ? 'default' : 'muted'} className="text-[9px] shrink-0">
                        {diff === 0 ? 'Today' : diff === 1 ? 'Tmrw' : `+${diff}d`}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Cases</DialogTitle>
            <DialogDescription>Upload a CSV or Excel file with your case data. Rows are validated before import.</DialogDescription>
          </DialogHeader>
          {parsedRows.length === 0 ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-[var(--radius-sm)] py-10 px-6 text-center transition-colors cursor-pointer',
                  dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                )}
              >
                <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-sans text-foreground font-medium">Drop your CSV or XLSX here</p>
                <p className="text-xs font-sans text-muted-foreground mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
              </div>
              <div className="text-xs font-sans text-muted-foreground space-y-1">
                <p>Required columns: Case No., First Party. Optional: Opposite Party, Court Name, Next Date, Status.</p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-foreground font-medium">{parsedRows.length} row(s) ready to import</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setParsedRows([]); setRowIssues([]); }}>
                  Choose another file
                </Button>
              </div>
              {rowIssues.length > 0 && (
                <div className="rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-xs font-sans font-medium text-destructive">Validation warnings</p>
                  {rowIssues.map((iss, i) => (
                    <p key={i} className="text-[11px] font-sans text-destructive/80">Row {iss.row}: {iss.message}</p>
                  ))}
                </div>
              )}
              <div className="border border-border rounded-[var(--radius-sm)] max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-[10px] font-sans text-muted-foreground uppercase tracking-wide">
                      <th className="px-3 py-1.5">Case No.</th>
                      <th className="px-3 py-1.5">Parties</th>
                      <th className="px-3 py-1.5">Next Date</th>
                      <th className="px-3 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5 font-mono text-[11px] text-primary">{r.caseNo}</td>
                        <td className="px-3 py-1.5 text-[11px] font-sans text-foreground truncate max-w-32">{r.firstParty}{r.oppositeParty ? ` v. ${r.oppositeParty}` : ''}</td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{r.nextDate || '—'}</td>
                        <td className="px-3 py-1.5"><Badge variant="pending" className="text-[9px]">{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter className="items-center justify-between sm:justify-between">
            <Button variant="link" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs px-2">
              <FileSpreadsheet size={13} /> Download template
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              {parsedRows.length > 0 && (
                <Button onClick={confirmImport} className="gap-1.5">
                  <Download size={14} /> Import {parsedRows.length} Cases
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Board Dialog */}
      <DailyBoardDialog open={dailyBoardOpen} onOpenChange={setDailyBoardOpen} todayCases={todayCases} />
    </div>
  );
}

function DailyBoardDialog({
  open,
  onOpenChange,
  todayCases,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  todayCases: Case[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto print:max-w-none print:max-h-none">
        <DialogHeader className="no-print">
          <DialogTitle className="font-serif">Daily Board — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</DialogTitle>
          <DialogDescription>All matters listed before you today across all courts.</DialogDescription>
        </DialogHeader>
        <div className="hidden print:block mb-4">
          <p className="font-serif text-base font-semibold">Daily Cause List — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="space-y-2 mt-2">
          {todayCases.length === 0 ? (
            <p className="text-sm font-sans text-muted-foreground py-8 text-center">No hearings for today. Enjoy the day off!</p>
          ) : (
            todayCases.map((c, idx) => (
              <div key={c.id} className="flex items-start gap-3 py-3 px-4 bg-muted/40 rounded-[var(--radius-sm)] border border-border print:bg-white print:border-neutral-300">
                <span className="font-mono text-xs font-semibold text-muted-foreground mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">{c.caseNo}</span>
                    <span className="text-xs font-sans text-muted-foreground">Court {c.courtNo || '—'}</span>
                    <Badge variant="awaited" className="text-[10px]">{c.fixedFor || '—'}</Badge>
                  </div>
                  <p className="text-sm font-sans text-foreground mt-0.5">{c.firstParty} v. {c.oppositeParty}</p>
                  <p className="text-xs font-sans text-muted-foreground">{c.courtName}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Download size={14} /> Print Board
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
