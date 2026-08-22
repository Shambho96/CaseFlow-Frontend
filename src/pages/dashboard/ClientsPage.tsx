import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Download, Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useClients } from '@/store/clientStore';
import { useCases } from '@/store/caseStore';
import { formatINR, getInitials, cn } from '@/lib/utils';
import type { Client } from '@/types';

const EMPTY_CLIENT: Omit<Client, 'id'> = {
  type: 'individual',
  name: '',
  email: '',
  phone: '',
  address: '',
  tan: '',
  pendingFees: 0,
  caseIds: [],
  createdAt: new Date().toISOString().split('T')[0],
};

export function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient, linkCaseToClient, unlinkCaseFromClient } = useClients();
  const { cases } = useCases();

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ clientId: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>(EMPTY_CLIENT);
  const [associateOpen, setAssociateOpen] = useState<string | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  const displayed = useMemo(() => {
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

  const startEdit = (clientId: string, field: string, currentVal: string) => {
    setEditingCell({ clientId, field });
    setEditVal(currentVal);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    updateClient(editingCell.clientId, { [editingCell.field]: editingCell.field === 'pendingFees' ? Number(editVal) : editVal });
    setEditingCell(null);
  };

  const handleAdd = () => {
    if (!newClient.name || !newClient.email) return;
    addClient({ ...newClient, id: `cli-${Date.now()}` });
    setNewClient(EMPTY_CLIENT);
    setAddOpen(false);
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
    // Add newly selected
    [...selectedCases].forEach((cid) => linkCaseToClient(associateOpen, cid));
    // Remove unselected
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
          <p className="text-sm font-sans text-muted-foreground">{displayed.length} clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download size={14} /> Export Excel
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
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
          onChange={(e) => setSearch(e.target.value)}
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
                        {editingCell?.clientId === client.id && editingCell.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              className="h-7 text-xs w-36"
                              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                              autoFocus
                            />
                            <Button size="icon-sm" variant="ghost" onClick={commitEdit}><Check size={12} /></Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(client.id, 'name', client.name)}
                            className="text-xs font-sans font-medium text-foreground hover:text-primary transition-colors text-left"
                          >
                            {client.name}
                          </button>
                        )}
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
                    {editingCell?.clientId === client.id && editingCell.field === 'pendingFees' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          className="h-7 text-xs w-24 font-mono"
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                          autoFocus
                        />
                        <Button size="icon-sm" variant="ghost" onClick={commitEdit}><Check size={12} /></Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(client.id, 'pendingFees', String(client.pendingFees))}
                        className={cn(
                          'font-mono text-xs font-medium hover:text-primary transition-colors',
                          client.pendingFees > 0 ? 'text-chart-3' : 'text-muted-foreground'
                        )}
                      >
                        {formatINR(client.pendingFees)}
                      </button>
                    )}
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    {editingCell?.clientId === client.id && editingCell.field === 'email' ? (
                      <div className="flex items-center gap-1">
                        <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="h-7 text-xs w-40" autoFocus onKeyDown={(e) => e.key === 'Enter' && commitEdit()} />
                        <Button size="icon-sm" variant="ghost" onClick={commitEdit}><Check size={12} /></Button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(client.id, 'email', client.email)} className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
                        {client.email}
                      </button>
                    )}
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

      {/* Add Client Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>Create a new client record to link cases and track fees.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewClient((p) => ({ ...p, type: 'individual' }))}
                className={cn('px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors', newClient.type === 'individual' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}
              >Individual</button>
              <button
                onClick={() => setNewClient((p) => ({ ...p, type: 'company' }))}
                className={cn('px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-sans transition-colors', newClient.type === 'company' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}
              >Company</button>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder={newClient.type === 'individual' ? 'Ramesh Kumar Sharma' : 'Deshmukh Textiles Pvt Ltd'} value={newClient.name} onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="ramesh@example.com" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" placeholder="9876543210" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="12, Shivaji Nagar, Pune – 411005" value={newClient.address} onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>TAN <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="MUMS12345F" value={newClient.tan} onChange={(e) => setNewClient((p) => ({ ...p, tan: e.target.value }))} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newClient.name || !newClient.email}>Add Client</Button>
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
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { deleteClient(deleteConfirm); setDeleteConfirm(null); } }}>Delete</Button>
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
                      v ? next.add(c.id) : next.delete(c.id);
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
