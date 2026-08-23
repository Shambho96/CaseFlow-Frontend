import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronDown,
  Eye, Trash2, Bell, MoreHorizontal, Printer,
  Archive, Tag, FileText, FileSpreadsheet, Columns3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useToast } from '@/store/toastStore';
import { formatDate, cn } from '@/lib/utils';
import { exportCsv, exportExcel } from '@/lib/exporters';
import type { CaseStatus, CaseCategory, Case, CaseLabel } from '@/types';

const PAGE_SIZES = [10, 20, 50, 100];

const LABEL_DOT: Record<CaseLabel['color'], string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  primary: 'bg-primary',
};

const COLUMN_DEFS = [
  { key: 'caseNo', label: 'Case No.' },
  { key: 'parties', label: 'Parties' },
  { key: 'courtNo', label: 'Court No.' },
  { key: 'court', label: 'Court' },
  { key: 'prevDate', label: 'Prev Date' },
  { key: 'nextDate', label: 'Next Date' },
  { key: 'fixedFor', label: 'Fixed For' },
  { key: 'labels', label: 'Labels' },
  { key: 'status', label: 'Status' },
] as const;
type ColumnKey = (typeof COLUMN_DEFS)[number]['key'];

const DEFAULT_VISIBLE: ColumnKey[] = ['caseNo', 'parties', 'courtNo', 'court', 'prevDate', 'nextDate', 'fixedFor', 'status'];

function StatusBadge({ status }: { status: CaseStatus }) {
  const variant = status === 'Decided' ? 'decided' : status === 'Awaited' ? 'awaited' : status === 'Abandoned' ? 'abandoned' : 'pending';
  return <Badge variant={variant as any}>{status}</Badge>;
}

export function CasesPage() {
  const { cases, deleteCase, clearFilters, filteredCases, filters, setFilters, bulkUpdateStatus, archiveCases, labels } = useCases();
  const { clients } = useClients();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<'whatsapp' | 'email' | 'both'>('both');
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CaseCategory | 'all'>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE));
  // Advanced search sheet state
  const [advCourt, setAdvCourt] = useState('');
  const [advDate, setAdvDate] = useState('');
  const [advFixedFor, setAdvFixedFor] = useState('');
  const [advOnlyAwaited, setAdvOnlyAwaited] = useState(false);
  const [advOnlyDecided, setAdvOnlyDecided] = useState(false);

  // Sync status filter set from Command Center cards / other pages
  useEffect(() => {
    setStatusFilter(filters.status ?? 'all');
  }, [filters.status]);

  const applyStatusFilter = (v: CaseStatus | 'all') => {
    setStatusFilter(v);
    setFilters({ status: v === 'all' ? undefined : v });
    setPage(1);
  };

  const displayed = useMemo(() => {
    let list = filteredCases;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.caseNo.toLowerCase().includes(q) ||
        c.courtNo.toLowerCase().includes(q) ||
        c.firstParty.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q) ||
        c.fixedFor.toLowerCase().includes(q) ||
        (c.nextDate || '').includes(search)
      );
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((c) => c.category === categoryFilter);
    if (labelFilter !== 'all') list = list.filter((c) => (c.labelIds ?? []).includes(labelFilter));
    if (advCourt.trim()) list = list.filter((c) => c.courtName.toLowerCase().includes(advCourt.toLowerCase()));
    if (advDate) list = list.filter((c) => c.nextDate === advDate || c.prevDate === advDate);
    if (advFixedFor.trim()) list = list.filter((c) => c.fixedFor.toLowerCase().includes(advFixedFor.toLowerCase()));
    if (advOnlyAwaited) list = list.filter((c) => c.status === 'Awaited' || !c.nextDate);
    if (advOnlyDecided) list = list.filter((c) => c.status === 'Decided');
    return list;
  }, [filteredCases, search, statusFilter, categoryFilter, labelFilter, advCourt, advDate, advFixedFor, advOnlyAwaited, advOnlyDecided]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const paginated = displayed.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(paginated.map((c) => c.id)));
  const clearSelect = () => setSelected(new Set());

  const selectedCases = [...selected].map((id) => cases.find((c) => c.id === id)).filter(Boolean) as Case[];

  // ── Export helpers ────────────────────────────────────────────────────────
  const EXPORT_HEADERS = ['Case No.', 'First Party', 'Opposite Party', 'Court', 'Court No.', 'Prev Date', 'Next Date', 'Fixed For', 'Status'];
  const caseToRow = (c: Case) => [
    c.caseNo, c.firstParty, c.oppositeParty, c.courtName, c.courtNo,
    formatDate(c.prevDate), formatDate(c.nextDate), c.fixedFor, c.status,
  ];
  const handleExportExcel = () => {
    const rows = (displayed as Case[]).map(caseToRow);
    exportExcel(`caseflow-cases-${new Date().toISOString().split('T')[0]}`, 'Cases', EXPORT_HEADERS, rows);
    toast(`${rows.length} case(s) exported to Excel.`);
  };
  const handleExportCsv = () => {
    exportCsv(`caseflow-cases-${new Date().toISOString().split('T')[0]}`, EXPORT_HEADERS, (displayed as Case[]).map(caseToRow));
    toast(`${displayed.length} case(s) exported to CSV.`);
  };
  const handlePrintPdf = () => window.print();

  const resetFilters = () => {
    setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setLabelFilter('all');
    setAdvCourt(''); setAdvDate(''); setAdvFixedFor(''); setAdvOnlyAwaited(false); setAdvOnlyDecided(false);
    setPage(1); clearFilters();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Cases</h1>
          <p className="text-sm font-sans text-muted-foreground">{displayed.length} cases{search ? ' matching search' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} className="gap-1.5">
            <Filter size={14} /> Advanced Search
          </Button>
          <Button size="sm" onClick={() => navigate('/dashboard/cases/new')} className="gap-1.5">
            <Plus size={14} /> New Case
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap no-print">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search case no., parties, court…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-xs"
            id="cases-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => applyStatusFilter(v as CaseStatus | 'all')}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Awaited">Awaited</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Decided">Decided</SelectItem>
            <SelectItem value="Abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v as any); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Civil">Civil</SelectItem>
            <SelectItem value="Criminal">Criminal</SelectItem>
            <SelectItem value="Arbitration">Arbitration</SelectItem>
            <SelectItem value="Consumer">Consumer</SelectItem>
            <SelectItem value="Tax">Tax</SelectItem>
            <SelectItem value="Labour">Labour</SelectItem>
            <SelectItem value="Family">Family</SelectItem>
          </SelectContent>
        </Select>

        {/* Label filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-36 justify-between text-xs font-normal">
              <span className="flex items-center gap-1.5 truncate">
                {labelFilter !== 'all' && (
                  <span className={cn('h-2 w-2 rounded-full shrink-0', LABEL_DOT[labels.find((l) => l.id === labelFilter)?.color ?? 'chart-5'])} />
                )}
                {labelFilter === 'all' ? 'All Labels' : labels.find((l) => l.id === labelFilter)?.name}
              </span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setLabelFilter('all'); setPage(1); }}>All Labels</DropdownMenuItem>
            <DropdownMenuSeparator />
            {labels.map((l) => (
              <DropdownMenuItem key={l.id} onClick={() => { setLabelFilter(l.id); setPage(1); }}>
                <span className={cn('h-2 w-2 rounded-full mr-2', LABEL_DOT[l.color])} />
                {l.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
              <Columns3 size={13} /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Show / Hide Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMN_DEFS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleCols.has(col.key)}
                onCheckedChange={(v) => {
                  setVisibleCols((prev) => {
                    const next = new Set(prev);
                    if (v) next.add(col.key); else next.delete(col.key);
                    return next.size === 0 ? prev : next;
                  });
                }}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions & export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
              <MoreHorizontal size={13} /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet size={14} /> Export Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv}>
              <FileText size={14} /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrintPdf}>
              <Printer size={14} /> Print / Save PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag size={14} /> Bulk Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(['Pending', 'Awaited', 'Decided', 'Abandoned'] as CaseStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    disabled={selected.size === 0}
                    onClick={() => {
                      bulkUpdateStatus([...selected], s);
                      toast(`${selected.size} case(s) marked ${s}.`);
                      setSelected(new Set());
                    }}
                  >
                    Mark as {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              disabled={selected.size === 0}
              onClick={() => {
                archiveCases([...selected]);
                toast(`${selected.size} case(s) archived.`);
                setSelected(new Set());
              }}
            >
              <Archive size={14} /> Archive Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {(search || statusFilter !== 'all' || categoryFilter !== 'all' || labelFilter !== 'all' || advCourt || advDate || advFixedFor || advOnlyAwaited || advOnlyDecided) && (
          <Button variant="ghost" size="sm" onClick={() => { resetFilters(); }} className="text-xs h-8 text-muted-foreground">
            Clear filters
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2.5 rounded-[var(--radius-sm)] flex-wrap no-print"
          >
            <span className="text-sm font-sans font-medium">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="muted"
                size="sm"
                onClick={() => setNotifyOpen(true)}
                className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-0 gap-1.5 text-xs h-8"
              >
                <Bell size={13} /> Notify via WhatsApp & Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelect}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs h-8"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === paginated.length && paginated.length > 0}
                  onCheckedChange={(v) => v ? selectAll() : clearSelect()}
                  aria-label="Select all"
                />
              </TableHead>
              {visibleCols.has('caseNo') && <TableHead>Case No.</TableHead>}
              {visibleCols.has('parties') && <TableHead>Parties</TableHead>}
              {visibleCols.has('courtNo') && <TableHead>Court No.</TableHead>}
              {visibleCols.has('court') && <TableHead>Court</TableHead>}
              {visibleCols.has('prevDate') && <TableHead>Prev Date</TableHead>}
              {visibleCols.has('nextDate') && <TableHead>Next Date</TableHead>}
              {visibleCols.has('fixedFor') && <TableHead>Fixed For</TableHead>}
              {visibleCols.has('labels') && <TableHead>Labels</TableHead>}
              {visibleCols.has('status') && <TableHead>Status</TableHead>}
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleCols.size + 2} className="py-16 text-center">
                  <p className="text-sm font-sans text-muted-foreground">No cases match your search.</p>
                  <Button variant="link" size="sm" onClick={resetFilters} className="mt-2">
                    Clear filters
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow key={c.id} data-state={selected.has(c.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                      aria-label={`Select ${c.caseNo}`}
                    />
                  </TableCell>
                  {visibleCols.has('caseNo') && (
                    <TableCell>
                      <Link to={`/dashboard/cases/${c.id}`} className="font-mono text-xs text-primary hover:underline font-medium">
                        {c.caseNo}
                      </Link>
                    </TableCell>
                  )}
                  {visibleCols.has('parties') && (
                    <TableCell>
                      <p className="text-xs font-sans text-foreground leading-tight">{c.firstParty}</p>
                      <p className="text-[10px] font-sans text-muted-foreground">v. {c.oppositeParty}</p>
                    </TableCell>
                  )}
                  {visibleCols.has('courtNo') && (
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{c.courtNo || '—'}</span>
                    </TableCell>
                  )}
                  {visibleCols.has('court') && (
                    <TableCell>
                      <p className="text-xs font-sans text-foreground">{c.courtName}</p>
                      <p className="text-[10px] font-sans text-muted-foreground">{c.courtType}</p>
                    </TableCell>
                  )}
                  {visibleCols.has('prevDate') && (
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{formatDate(c.prevDate)}</span>
                    </TableCell>
                  )}
                  {visibleCols.has('nextDate') && (
                    <TableCell>
                      <span className={cn('font-mono text-xs', c.nextDate && c.nextDate <= new Date().toISOString().split('T')[0] ? 'text-chart-3 font-semibold' : 'text-foreground')}>
                        {formatDate(c.nextDate)}
                      </span>
                    </TableCell>
                  )}
                  {visibleCols.has('fixedFor') && (
                    <TableCell>
                      <span className="text-xs font-sans text-muted-foreground">{c.fixedFor || '—'}</span>
                    </TableCell>
                  )}
                  {visibleCols.has('labels') && (
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap max-w-32">
                        {(c.labelIds ?? []).length === 0 && <span className="text-muted-foreground text-[10px]">—</span>}
                        {(c.labelIds ?? []).slice(0, 2).map((lid) => {
                          const lbl = labels.find((l) => l.id === lid);
                          if (!lbl) return null;
                          return (
                            <span key={lid} className="inline-flex items-center gap-1 bg-muted text-muted-foreground border border-border rounded-full px-1.5 py-0.5 text-[9px] font-sans">
                              <span className={cn('h-1.5 w-1.5 rounded-full', LABEL_DOT[lbl.color])} />
                              {lbl.name}
                            </span>
                          );
                        })}
                        {(c.labelIds ?? []).length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{(c.labelIds ?? []).length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleCols.has('status') && (
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link to={`/dashboard/cases/${c.id}`}>
                        <Button variant="ghost" size="icon-sm" aria-label="View case">
                          <Eye size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete case"
                        onClick={() => setDeleteConfirm(c.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between no-print">
        <p className="text-xs font-sans text-muted-foreground">
          Showing {Math.min((page - 1) * pageSize + 1, displayed.length)}–{Math.min(page * pageSize, displayed.length)} of {displayed.length}
        </p>
        <div className="flex items-center gap-1">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-[74px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s} / pg</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={14} />
          </Button>
          <span className="font-mono text-xs px-3">{page} / {totalPages}</span>
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* Notify Preview Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notify Clients via WhatsApp & Email</DialogTitle>
            <DialogDescription>
              Personalized hearing reminders will be sent for {selected.size} case(s). Choose a channel and review before sending.
            </DialogDescription>
          </DialogHeader>

          {/* Channel selection */}
          <div className="grid grid-cols-3 gap-2">
            {([
              ['whatsapp', 'WhatsApp'],
              ['email', 'Email'],
              ['both', 'Both'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setNotifyChannel(key)}
                className={cn(
                  'px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-sans transition-colors capitalize',
                  notifyChannel === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Per-case personalized previews with deep links */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedCases.map((c) => {
              const linkedClients = c.clientIds
                .map((cid) => clients.find((cl) => cl.id === cid))
                .filter(Boolean);
              const msg =
                `Dear Client, hearing in ${c.caseNo} (${c.firstParty} v. ${c.oppositeParty}) is listed on ${formatDate(c.nextDate)}, ${c.courtName}, Court No. ${c.courtNo || '—'} for ${c.fixedFor || 'hearing'}. — Adv. Nikhil Joshi`;
              return (
                <div key={c.id} className="border border-border rounded-[var(--radius-sm)] p-3 space-y-1.5">
                  <p className="font-mono text-[11px] font-semibold text-primary">{c.caseNo}</p>
                  <div className="bg-muted rounded-[var(--radius-sm)] p-2.5 text-[11px] font-sans text-foreground leading-relaxed whitespace-pre-line">
                    {msg}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {linkedClients.length === 0 && (
                      <span className="text-[10px] font-sans text-muted-foreground">No client linked</span>
                    )}
                    {linkedClients.map((cl) => (
                      <div key={cl!.id} className="flex items-center gap-1">
                        {(notifyChannel === 'whatsapp' || notifyChannel === 'both') && cl!.phone && (
                          <a
                            href={`https://wa.me/91${cl!.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-chart-1/15 text-chart-1 border border-chart-1/20 rounded-full px-2 py-0.5 text-[10px] font-sans hover:bg-chart-1/25 transition-colors"
                          >
                            <Bell size={10} /> {cl!.phone}
                          </a>
                        )}
                        {(notifyChannel === 'email' || notifyChannel === 'both') && cl!.email && (
                          <a
                            href={`mailto:${cl!.email}?subject=${encodeURIComponent(`Hearing Reminder — ${c.caseNo}`)}&body=${encodeURIComponent(msg)}`}
                            className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-sans hover:bg-accent/70 transition-colors"
                          >
                            <Bell size={10} /> Email
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setNotifyOpen(false);
                const channelLabel = notifyChannel === 'both' ? 'WhatsApp & Email' : notifyChannel === 'whatsapp' ? 'WhatsApp' : 'Email';
                toast(`${channelLabel} drafts opened for ${selected.size} case(s). Review and press send in each window.`);
                setSelected(new Set());
              }}
              className="gap-1.5"
            >
              <Bell size={14} /> Open Send Links ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Case?</DialogTitle>
            <DialogDescription>This action cannot be undone. The case will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { deleteCase(deleteConfirm); toast('Case deleted.', 'info'); setDeleteConfirm(null); } }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="right" className="w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Advanced Search</SheetTitle>
            <SheetDescription>Filter cases by multiple criteria</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Court Name</Label>
              <Input placeholder="e.g. Bombay High Court" className="text-sm" value={advCourt} onChange={(e) => setAdvCourt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hearing Date</Label>
              <Input type="date" className="text-sm font-mono" value={advDate} onChange={(e) => setAdvDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fixed For</Label>
              <Input placeholder="e.g. Arguments" className="text-sm" value={advFixedFor} onChange={(e) => setAdvFixedFor(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="adv-only-awaited" checked={advOnlyAwaited} onCheckedChange={(v) => setAdvOnlyAwaited(!!v)} />
              <Label htmlFor="adv-only-awaited">Only Awaited (no next date)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="adv-only-decided" checked={advOnlyDecided} onCheckedChange={(v) => setAdvOnlyDecided(!!v)} />
              <Label htmlFor="adv-only-decided">Only Decided</Label>
            </div>
          </div>
          <div className="flex gap-2 mt-8">
            <Button variant="outline" onClick={() => { setAdvCourt(''); setAdvDate(''); setAdvFixedFor(''); setAdvOnlyAwaited(false); setAdvOnlyDecided(false); }} className="flex-1">Reset</Button>
            <Button onClick={() => { setPage(1); setSearchOpen(false); }} className="flex-1">Apply</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
