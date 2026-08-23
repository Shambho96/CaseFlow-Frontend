import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent,
  DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportExcel } from '@/lib/exporters';
import { scopedCaseIdSet } from '@/lib/scope';
import { cn, formatINR, getInitials } from '@/lib/utils';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useToast } from '@/store/toastStore';
import { useUI } from '@/store/uiStore';
import type { Client } from '@/types';
import { ChevronLeft, ChevronRight, Download, Link2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 10;

interface ClientFormFields {
  type: 'individual' | 'company';
  name: string;
  firmName: string;
  email: string;
  phone: string;
  address: string;
  tan: string;
  pendingFees: number;
}

const EMPTY_FORM: ClientFormFields = {
  type: 'individual',
  name: '',
  firmName: '',
  email: '',
  phone: '',
  address: '',
  tan: '',
  pendingFees: 0,
};

export function ClientsPage() {
  const { clients: allClients, addClient, updateClient, deleteClient, linkCaseToClient, unlinkCaseFromClient } = useClients();
  const { cases } = useCases();
  const { toast } = useToast();
  const { scope } = useUI();

  // Scope-aware clients: clients with at least one case inside the active scope
  const scopedIds = useMemo(() => scopedCaseIdSet(cases, scope), [cases, scope]);
  const clients = useMemo(() => {
    if (scope.kind === 'all' || !scope.value) return allClients;
    return allClients.filter((c) => c.caseIds.some((id) => scopedIds.has(id)));
  }, [allClients, scope, scopedIds]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [associateOpen, setAssociateOpen] = useState<string | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  // Single add/edit dialog driven by mode
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormFields>(EMPTY_FORM);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.tan && c.tan.toLowerCase().includes(q))
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayed = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const totalPendingFees = useMemo(
    () => clients.reduce((sum, c) => sum + (c.pendingFees || 0), 0),
    [clients]
  );

  const openAdd = () => {
    setFormMode('add');
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setFormMode('edit');
    setEditId(client.id);
    setForm({
      type: client.type,
      name: client.name,
      firmName: client.firmName ?? '',
      email: client.email,
      phone: client.phone,
      address: client.address,
      tan: client.tan ?? '',
      pendingFees: client.pendingFees,
    });
    setFormOpen(true);
  };

  const handleSaveForm = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (formMode === 'add') {
      addClient({
        ...form,
        id: `cli-${Date.now()}`,
        caseIds: [],
        createdAt: new Date().toISOString().split('T')[0],
      });
      toast('Client added successfully.');
    } else if (editId) {
      updateClient(editId, { ...form });
      toast('Client updated.');
    }
    setFormOpen(false);
  };

  const handleExport = () => {
    exportExcel(
      `caseflow-clients-${new Date().toISOString().split('T')[0]}`,
      'Clients',
      ['Name', 'Type', 'No. of Cases', 'Pending Fees', 'Email', 'Phone', 'Address', 'TAN'],
      clients.map((c) => [c.name, c.type, c.caseIds.length, c.pendingFees, c.email, c.phone, c.address, c.tan ?? ''])
    );
    toast(`${clients.length} client(s) exported to Excel.`);
  };

  const openAssociate = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) setSelectedCases(new Set(client.caseIds));
    setAssociateOpen(clientId);
    setCaseSearch('');
  };

  const saveAssociation = () => {
    if (!associateOpen) return;
    const client = clients.find((c) => c.id === associateOpen);
    if (!client) return;
    [...selectedCases].forEach((cid) => linkCaseToClient(associateOpen, cid));
    client.caseIds.forEach((cid) => {
      if (!selectedCases.has(cid)) unlinkCaseFromClient(associateOpen, cid);
    });
    setAssociateOpen(null);
  };

  const filteredCasesForAssociate = useMemo(() => {
    const q = caseSearch.toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.caseNo.toLowerCase().includes(q) ||
        c.firstParty.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q)
    );
  }, [cases, caseSearch]);

  const associateClient = associateOpen ? clients.find((c) => c.id === associateOpen) : null;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm font-sans text-muted-foreground">
            {displayed.length} of {filtered.length} clients · Total pending fees{' '}
            <span className="font-mono text-chart-3">{formatINR(totalPendingFees)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download size={14} /> Export Excel
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus size={14} /> Add Client
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, phone, email, TAN…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-8 h-8 text-xs"
          id="clients-search"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cases</TableHead>
              <TableHead>Pending Fees</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>TAN</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <p className="text-sm font-sans text-muted-foreground">
                    {search ? 'No clients match your search.' : 'No clients yet. Add your first client to get started.'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((client) => (
                <TableRow key={client.id}>
                  {/* Name */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{getInitials(client.name)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-sans font-medium text-foreground">{client.name}</p>
                        <p className="text-[10px] font-sans text-muted-foreground capitalize">{client.type}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cases */}
                  <TableCell>
                    <Badge variant="accent" className="font-mono">{client.caseIds.length}</Badge>
                  </TableCell>

                  {/* Pending Fees */}
                  <TableCell>
                    <span className={cn(
                      'font-mono text-xs font-medium',
                      client.pendingFees > 0 ? 'text-chart-3' : 'text-muted-foreground'
                    )}>
                      {formatINR(client.pendingFees)}
                    </span>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <span className="text-xs font-sans text-muted-foreground">{client.email}</span>
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{client.phone}</span>
                  </TableCell>

                  {/* TAN */}
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{client.tan || '—'}</span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(client)}
                        aria-label={`Edit ${client.name}`}
                        title="Edit client"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openAssociate(client.id)}
                        aria-label="Associate cases"
                        title="Associate Cases"
                      >
                        <Link2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(client.id)}
                        aria-label="Delete client"
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
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
      )}

      {/* Add / Edit Client Dialog — full info */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Add Client' : 'Edit Client'}</DialogTitle>
            <DialogDescription>
              {formMode === 'add'
                ? 'Create a complete client record — contact, tax and billing details.'
                : 'Update any detail of this client record.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setForm((p) => ({ ...p, type: 'individual' }))}
                className={
                  form.type === 'individual'
                    ? 'px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors bg-primary text-primary-foreground border-primary'
                    : 'px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors border-border hover:bg-accent'
                }
              >Individual</button>
              <button
                onClick={() => setForm((p) => ({ ...p, type: 'company' }))}
                className={
                  form.type === 'company'
                    ? 'px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors bg-primary text-primary-foreground border-primary'
                    : 'px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors border-border hover:bg-accent'
                }
              >Company</button>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder={form.type === 'individual' ? 'Ramesh Kumar Sharma' : 'Deshmukh Textiles Pvt Ltd'}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            {form.type === 'company' && (
              <div className="space-y-1.5">
                <Label>Firm / Company Name</Label>
                <Input
                  placeholder="Registered entity name"
                  value={form.firmName}
                  onChange={(e) => setForm((p) => ({ ...p, firmName: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="ramesh@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" placeholder="9876543210" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="12, Shivaji Nagar, Pune – 411005" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>TAN <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input placeholder="MUMS12345F" value={form.tan} onChange={(e) => setForm((p) => ({ ...p, tan: e.target.value }))} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Pending Fees (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.pendingFees}
                  onChange={(e) => setForm((p) => ({ ...p, pendingFees: Number(e.target.value) || 0 }))}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveForm} disabled={!form.name.trim() || !form.email.trim()}>
              {formMode === 'add' ? 'Add Client' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
            <DialogDescription>This cannot be undone. All case associations will also be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { deleteClient(deleteConfirm); toast('Client deleted.', 'info'); setDeleteConfirm(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Associate Cases Modal */}
      <Dialog open={!!associateOpen} onOpenChange={() => setAssociateOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Associate Cases — {associateClient?.name}</DialogTitle>
            <DialogDescription>Select cases to link with this client. Search by case number or party name.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search cases…"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredCasesForAssociate.map((c) => (
              <label
                key={c.id}
                className="flex items-start gap-3 py-2.5 px-3 rounded-[var(--radius-sm)] hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedCases.has(c.id)}
                  onCheckedChange={(v) => {
                    setSelectedCases((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(c.id); else next.delete(c.id);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-mono text-xs font-semibold text-primary">{c.caseNo}</p>
                  <p className="text-xs font-sans text-foreground">{c.firstParty} v. {c.oppositeParty}</p>
                  <p className="text-[10px] font-sans text-muted-foreground">{c.courtName}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssociateOpen(null)}>Cancel</Button>
            <Button onClick={saveAssociation}>Save Associations ({selectedCases.size})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
