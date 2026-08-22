import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight,
  Eye, Trash2, Bell
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { formatDate, cn } from '@/lib/utils';
import type { CaseStatus, CaseCategory } from '@/types';

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: CaseStatus }) {
  const variant = status === 'Decided' ? 'decided' : status === 'Awaited' ? 'awaited' : status === 'Abandoned' ? 'abandoned' : 'pending';
  return <Badge variant={variant as any}>{status}</Badge>;
}

export function CasesPage() {
  const { cases, deleteCase, clearFilters, filteredCases } = useCases();
  const { clients } = useClients();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CaseCategory | 'all'>('all');

  const displayed = useMemo(() => {
    let list = filteredCases;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.caseNo.toLowerCase().includes(q) ||
        c.firstParty.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q) ||
        c.fixedFor.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((c) => c.category === categoryFilter);
    return list;
  }, [filteredCases, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const paginated = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(paginated.map((c) => c.id)));
  const clearSelect = () => setSelected(new Set());

  const selectedCases = [...selected].map((id) => cases.find((c) => c.id === id)).filter(Boolean) as typeof cases;

  const notifyMessage = selectedCases.map((c) => {
    const clientNames = c.clientIds.map((cid) => clients.find((cl) => cl.id === cid)?.name ?? '—').join(', ');
    return `${c.caseNo} (${c.firstParty} v. ${c.oppositeParty}) — ${c.courtName}, Court ${c.courtNo} on ${formatDate(c.nextDate)} for ${c.fixedFor}. Clients: ${clientNames}`;
  }).join('\n\n');

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
      <div className="flex items-center gap-3 flex-wrap">
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
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
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
        {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); clearFilters(); }} className="text-xs h-8 text-muted-foreground">
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
            className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2.5 rounded-[var(--radius-sm)] flex-wrap"
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
              <TableHead>Case No.</TableHead>
              <TableHead>Parties</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Prev Date</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead>Fixed For</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center">
                  <p className="text-sm font-sans text-muted-foreground">No cases match your search.</p>
                  <Button variant="link" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="mt-2">
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
                  <TableCell>
                    <Link to={`/dashboard/cases/${c.id}`} className="font-mono text-xs text-primary hover:underline font-medium">
                      {c.caseNo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-sans text-foreground leading-tight">{c.firstParty}</p>
                    <p className="text-[10px] font-sans text-muted-foreground">v. {c.oppositeParty}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-sans text-foreground">{c.courtName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">Ct. {c.courtNo}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{formatDate(c.prevDate)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('font-mono text-xs', c.nextDate <= new Date().toISOString().split('T')[0] ? 'text-chart-3 font-semibold' : 'text-foreground')}>
                      {formatDate(c.nextDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-sans text-muted-foreground">{c.fixedFor}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
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
      <div className="flex items-center justify-between">
        <p className="text-xs font-sans text-muted-foreground">
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, displayed.length)}–{Math.min(page * PAGE_SIZE, displayed.length)} of {displayed.length}
        </p>
        <div className="flex items-center gap-1">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notify Clients via WhatsApp & Email</DialogTitle>
            <DialogDescription>
              The following message will be sent to {selected.size} client(s). Review before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-[var(--radius-sm)] p-4 text-xs font-sans text-foreground leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
            {notifyMessage || 'No cases selected.'}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button onClick={() => { setNotifyOpen(false); setNotifyConfirmOpen(true); }} className="gap-1.5">
              <Bell size={14} /> Send Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Confirmation */}
      <Dialog open={notifyConfirmOpen} onOpenChange={setNotifyConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notifications Sent!</DialogTitle>
            <DialogDescription>
              WhatsApp and Email notifications have been queued for {selected.size} case(s). Clients will receive them shortly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setNotifyConfirmOpen(false); clearSelect(); }}>Done</Button>
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
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { deleteCase(deleteConfirm); setDeleteConfirm(null); } }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Advanced Search</SheetTitle>
            <SheetDescription>Filter cases by multiple criteria</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Court Name</Label>
              <Input placeholder="e.g. Bombay High Court" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Hearing Date</Label>
              <Input type="date" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Fixed For</Label>
              <Input placeholder="e.g. Arguments" className="text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="adv-only-awaited" />
              <Label htmlFor="adv-only-awaited">Only Awaited</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="adv-only-decided" />
              <Label htmlFor="adv-only-decided">Only Decided</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="adv-include-decided" defaultChecked />
              <Label htmlFor="adv-include-decided">Include Decided</Label>
            </div>
          </div>
          <div className="flex gap-2 mt-8">
            <Button variant="outline" onClick={() => setSearchOpen(false)} className="flex-1">Reset</Button>
            <Button onClick={() => setSearchOpen(false)} className="flex-1">Apply</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
