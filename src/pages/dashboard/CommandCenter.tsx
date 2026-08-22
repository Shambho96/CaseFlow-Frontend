import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Briefcase, Calendar, Clock, CheckCircle,
  Upload, Download, LayoutList, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useCases } from '@/store/caseStore';
import { isToday, isTomorrow } from '@/lib/utils';

const CHART_COLORS = [
  'oklch(0.7459 0.1483 156.4499)',
  'oklch(0.5393 0.2713 286.7462)',
  'oklch(0.7336 0.1758 50.5517)',
  'oklch(0.5828 0.1809 259.7276)',
  'oklch(0.5590 0 0)',
];

export function CommandCenter() {
  const { cases, setFilters } = useCases();
  const [importOpen, setImportOpen] = useState(false);
  const [dailyBoardOpen, setDailyBoardOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const stats = useMemo(() => ({
    total: cases.length,
    today: cases.filter((c) => isToday(c.nextDate)).length,
    tomorrow: cases.filter((c) => isTomorrow(c.nextDate)).length,
    awaited: cases.filter((c) => c.status === 'Awaited').length,
    decided: cases.filter((c) => c.status === 'Decided').length,
  }), [cases]);

  const purposeData = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      const k = c.fixedFor || 'Other';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [cases]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const ageData = [
    { name: '0–1 yr', value: cases.filter((c) => { const y = new Date().getFullYear() - new Date(c.filedDate).getFullYear(); return y < 1; }).length },
    { name: '1–3 yr', value: cases.filter((c) => { const y = new Date().getFullYear() - new Date(c.filedDate).getFullYear(); return y >= 1 && y < 3; }).length },
    { name: '3–5 yr', value: cases.filter((c) => { const y = new Date().getFullYear() - new Date(c.filedDate).getFullYear(); return y >= 3 && y < 5; }).length },
    { name: '5+ yr', value: cases.filter((c) => { const y = new Date().getFullYear() - new Date(c.filedDate).getFullYear(); return y >= 5; }).length },
  ];

  const todayCases = cases.filter((c) => isToday(c.nextDate));

  const STATUS_CARDS = [
    { label: 'All Cases', value: stats.total, icon: Briefcase, color: 'text-foreground', filter: undefined },
    { label: "Today's", value: stats.today, icon: Calendar, color: 'text-chart-3', filter: undefined },
    { label: "Tomorrow's", value: stats.tomorrow, icon: Clock, color: 'text-chart-4', filter: undefined },
    { label: 'Awaited', value: stats.awaited, icon: Clock, color: 'text-accent-foreground', filter: 'Awaited' as const },
    { label: 'Decided', value: stats.decided, icon: CheckCircle, color: 'text-chart-1', filter: 'Decided' as const },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Command Center</h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload size={14} />
            Import
          </Button>
          <Button size="sm" onClick={() => setDailyBoardOpen(true)} className="gap-1.5">
            <LayoutList size={14} />
            Get Daily Board
          </Button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              to={card.filter ? `/dashboard/cases?status=${card.filter}` : '/dashboard/cases'}
              onClick={() => card.filter && setFilters({ status: card.filter })}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <card.icon size={16} className={card.color} />
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="font-mono text-2xl font-semibold text-foreground">{card.value}</div>
                  <div className="text-xs font-sans text-muted-foreground mt-0.5">{card.label}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans">Cases by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {categoryData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs font-sans text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fixed for purposes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans">Cases by Purpose (Fixed For)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={purposeData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-sans)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="oklch(0.5393 0.2713 286.7462)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pending by age + mini calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans">Pending Cases by Age</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ageData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-sans)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="oklch(0.7336 0.1758 50.5517)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's agenda */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans">Today's Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            {todayCases.length === 0 ? (
              <p className="text-sm font-sans text-muted-foreground">No hearings scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todayCases.slice(0, 4).map((c) => (
                  <Link key={c.id} to={`/dashboard/cases/${c.id}`}>
                    <div className="group flex items-start gap-2 py-2 border-b border-border last:border-0 hover:bg-muted/30 rounded-[var(--radius-sm)] px-1 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-primary">{c.caseNo}</p>
                        <p className="text-xs font-sans text-foreground truncate">{c.firstParty} v. {c.oppositeParty}</p>
                        <p className="text-[10px] font-sans text-muted-foreground">Ct. {c.courtNo} · {c.fixedFor}</p>
                      </div>
                      <Badge variant="awaited" className="shrink-0 text-[10px]">{c.status}</Badge>
                    </div>
                  </Link>
                ))}
                {todayCases.length > 4 && (
                  <Link to="/dashboard/cases" className="text-xs font-sans text-primary hover:underline block pt-1">
                    +{todayCases.length - 4} more today
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Cases</DialogTitle>
            <DialogDescription>Upload a CSV or Excel file with your case data.</DialogDescription>
          </DialogHeader>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
            className={`border-2 border-dashed rounded-[var(--radius-sm)] py-10 px-6 text-center transition-colors ${dragOver ? 'border-primary bg-accent' : 'border-border'}`}
          >
            <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-sans text-foreground font-medium">Drop your CSV or XLSX here</p>
            <p className="text-xs font-sans text-muted-foreground mt-1">or</p>
            <Button variant="outline" size="sm" className="mt-3">Browse file</Button>
          </div>
          <div className="text-xs font-sans text-muted-foreground space-y-1">
            <p>Supported formats: CSV, XLSX</p>
            <p>Required columns: Case No., Court, Parties, Next Date, Status</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={() => setImportOpen(false)}>Import Cases</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Board Dialog */}
      <Dialog open={dailyBoardOpen} onOpenChange={setDailyBoardOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Daily Board — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</DialogTitle>
            <DialogDescription>All matters listed before you today across all courts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {todayCases.length === 0 ? (
              <p className="text-sm font-sans text-muted-foreground py-8 text-center">No hearings for today. Enjoy the day off! 🎉</p>
            ) : (
              todayCases.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-3 px-4 bg-muted/40 rounded-[var(--radius-sm)] border border-border">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0 mt-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">{c.caseNo}</span>
                      <span className="text-xs font-sans text-muted-foreground">Court {c.courtNo}</span>
                      <Badge variant="awaited" className="text-[10px]">{c.fixedFor}</Badge>
                    </div>
                    <p className="text-sm font-sans text-foreground mt-0.5">{c.firstParty} v. {c.oppositeParty}</p>
                    <p className="text-xs font-sans text-muted-foreground">{c.courtName}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Download size={14} /> Print Board
            </Button>
            <Button onClick={() => setDailyBoardOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
