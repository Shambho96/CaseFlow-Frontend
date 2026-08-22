import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, AlertCircle, Search, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { fuzzyMatch, cn } from '@/lib/utils';
import type { Case } from '@/types';
import { advocates } from '@/mocks/advocates';

const EMPTY_CASE: Omit<Case, 'id'> = {
  caseNo: '',
  category: 'Civil',
  status: 'Pending',
  courtType: 'High Court',
  courtName: '',
  courtNo: '',
  firstParty: '',
  oppositeParty: '',
  fixedFor: '',
  prevDate: '',
  nextDate: '',
  filedDate: '',
  stage: '',
  clientIds: [],
  advocateIds: [],
};

export function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateCase, addCase, getCase } = useCases();
  const { clients, searchClients } = useClients();

  const isNew = id === 'new';
  const existingCase = isNew ? null : getCase(id!);

  const [form, setForm] = useState<Omit<Case, 'id'>>(existingCase ?? EMPTY_CASE);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<typeof clients>([]);
  const [fuzzyWarning, setFuzzyWarning] = useState('');

  useEffect(() => {
    if (existingCase) setForm(existingCase);
  }, [existingCase]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setIsDirty(true);
    setSaved(false);
  };

  const updateDirect = (field: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaved(false);
  };

  const handleClientSearch = (q: string) => {
    setClientSearch(q);
    if (!q.trim()) { setClientSuggestions([]); setFuzzyWarning(''); return; }
    const results = searchClients(q);
    setClientSuggestions(results.slice(0, 6));
    // Fuzzy match warning
    if (results.length === 0 && (form.firstParty || form.oppositeParty)) {
      const similar = clients.filter((c) =>
        fuzzyMatch(q, c.name) || fuzzyMatch(c.name.split(' ').slice(0, 2).join(' '), q)
      );
      if (similar.length > 0) {
        setFuzzyWarning(`Did you mean: ${similar.map((c) => c.name).join(', ')}?`);
      }
    } else {
      setFuzzyWarning('');
    }
  };

  const linkClient = (clientId: string) => {
    if (!form.clientIds.includes(clientId)) {
      updateDirect('clientIds', [...form.clientIds, clientId]);
    }
    setClientSearch('');
    setClientSuggestions([]);
  };

  const unlinkClient = (clientId: string) => {
    updateDirect('clientIds', form.clientIds.filter((id) => id !== clientId));
  };

  const handleSave = () => {
    if (isNew) {
      const newId = `case-${Date.now()}`;
      addCase({ ...form, id: newId } as Case);
      navigate(`/dashboard/cases/${newId}`);
    } else if (id) {
      updateCase(id, form);
    }
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!isNew && !existingCase) {
    return (
      <div className="p-8 text-center">
        <p className="font-sans text-muted-foreground">Case not found.</p>
        <Link to="/dashboard/cases"><Button variant="link" className="mt-2">Back to Cases</Button></Link>
      </div>
    );
  }

  const linkedClients = form.clientIds.map((cid) => clients.find((c) => c.id === cid)).filter(Boolean) as typeof clients;

  return (
    <div className="relative min-h-screen">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm px-6 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/dashboard/cases')} aria-label="Back">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-lg font-semibold text-foreground">
            {isNew ? 'New Case' : (
              <><span className="font-mono text-primary">{form.caseNo}</span> — {form.firstParty} v. {form.oppositeParty}</>
            )}
          </h1>
        </div>
        {isDirty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
            <AlertCircle size={13} className="text-chart-3" />
            Unsaved changes
          </motion.div>
        )}
        {saved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-sans text-chart-1">
            ✓ Saved
          </motion.div>
        )}
        <Button onClick={handleSave} disabled={!isDirty} className="gap-1.5">
          <Save size={14} />
          {isNew ? 'Create Case' : 'Save Changes'}
        </Button>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="court">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-6">
            <TabsTrigger value="court">Court Identifiers</TabsTrigger>
            <TabsTrigger value="case">Case Identifiers</TabsTrigger>
            <TabsTrigger value="litigants">Litigants</TabsTrigger>
            {form.category === 'Criminal' && <TabsTrigger value="criminal">Criminal Specifics</TabsTrigger>}
            <TabsTrigger value="stage">Stage & Lifecycle</TabsTrigger>
            <TabsTrigger value="status">Status Controls</TabsTrigger>
            <TabsTrigger value="relations">Relations</TabsTrigger>
          </TabsList>

          {/* Court Identifiers */}
          <TabsContent value="court">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="courtType">Court Type</Label>
                <Select value={form.courtType} onValueChange={(v) => updateDirect('courtType', v)}>
                  <SelectTrigger id="courtType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High Court">High Court</SelectItem>
                    <SelectItem value="District Court">District Court</SelectItem>
                    <SelectItem value="NCLT">NCLT</SelectItem>
                    <SelectItem value="Consumer Commission">Consumer Commission</SelectItem>
                    <SelectItem value="Supreme Court">Supreme Court</SelectItem>
                    <SelectItem value="Tribunal">Tribunal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courtName">Court Name</Label>
                <Input id="courtName" value={form.courtName} onChange={update('courtName')} placeholder="Bombay High Court" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courtNo">Court Number</Label>
                <Input id="courtNo" value={form.courtNo} onChange={update('courtNo')} placeholder="15" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="judgeName">Judge Name</Label>
                <Input id="judgeName" value={form.judgeName ?? ''} onChange={update('judgeName')} placeholder="Hon. Justice R.D. Kulkarni" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docketRef">Docket Reference</Label>
                <Input id="docketRef" value={form.docketRef ?? ''} onChange={update('docketRef')} placeholder="BHC-2024-CIV-1123" className="font-mono" />
              </div>
            </div>
          </TabsContent>

          {/* Case Identifiers */}
          <TabsContent value="case">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="caseNo">Case Number</Label>
                <Input id="caseNo" value={form.caseNo} onChange={update('caseNo')} placeholder="CIV/2024/1123" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={(v) => updateDirect('category', v)}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Criminal">Criminal</SelectItem>
                    <SelectItem value="Constitutional">Constitutional</SelectItem>
                    <SelectItem value="Consumer">Consumer</SelectItem>
                    <SelectItem value="Tax">Tax</SelectItem>
                    <SelectItem value="Arbitration">Arbitration</SelectItem>
                    <SelectItem value="Labour">Labour</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filedDate">Date Filed</Label>
                <Input id="filedDate" type="date" value={form.filedDate} onChange={update('filedDate')} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes ?? ''} onChange={update('notes')} placeholder="Any background notes…" rows={3} />
              </div>
            </div>
          </TabsContent>

          {/* Litigants */}
          <TabsContent value="litigants">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="firstParty">First Party</Label>
                <Input id="firstParty" value={form.firstParty} onChange={update('firstParty')} placeholder="Ramesh Kumar Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oppositeParty">Opposite Party</Label>
                <Input id="oppositeParty" value={form.oppositeParty} onChange={update('oppositeParty')} placeholder="Municipal Corporation" />
              </div>
            </div>
          </TabsContent>

          {/* Criminal Specifics */}
          {form.category === 'Criminal' && (
            <TabsContent value="criminal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="firNo">FIR Number</Label>
                  <Input id="firNo" value={form.firNo ?? ''} onChange={update('firNo')} placeholder="FIR/223/2023" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="policeStation">Police Station</Label>
                  <Input id="policeStation" value={form.policeStation ?? ''} onChange={update('policeStation')} placeholder="Deccan PS, Pune" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="sections">Sections Applied</Label>
                  <Input id="sections" value={form.sections ?? ''} onChange={update('sections')} placeholder="IPC 406, 420" className="font-mono" />
                </div>
              </div>
            </TabsContent>
          )}

          {/* Stage & Lifecycle */}
          <TabsContent value="stage">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="stage">Current Stage</Label>
                <Input id="stage" value={form.stage} onChange={update('stage')} placeholder="Arguments" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fixedFor">Fixed For</Label>
                <Input id="fixedFor" value={form.fixedFor} onChange={update('fixedFor')} placeholder="Arguments" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prevDate">Previous Date</Label>
                <Input id="prevDate" type="date" value={form.prevDate} onChange={update('prevDate')} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextDate">Next Date</Label>
                <Input id="nextDate" type="date" value={form.nextDate} onChange={update('nextDate')} className="font-mono" />
              </div>
            </div>
          </TabsContent>

          {/* Status Controls */}
          <TabsContent value="status">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => updateDirect('status', v)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Awaited">Awaited</SelectItem>
                    <SelectItem value="Decided">Decided</SelectItem>
                    <SelectItem value="Abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === 'Decided' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="decidedDate">Date Decided</Label>
                    <Input id="decidedDate" type="date" value={form.decidedDate ?? ''} onChange={update('decidedDate')} className="font-mono" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="decisionSummary">Decision Summary</Label>
                    <Textarea id="decisionSummary" value={form.decisionSummary ?? ''} onChange={update('decisionSummary')} rows={3} />
                  </div>
                </>
              )}
              {form.status === 'Abandoned' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="abandonedDate">Date Abandoned</Label>
                    <Input id="abandonedDate" type="date" value={form.abandonedDate ?? ''} onChange={update('abandonedDate')} className="font-mono" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="abandonReason">Reason for Abandonment</Label>
                    <Textarea id="abandonReason" value={form.abandonReason ?? ''} onChange={update('abandonReason')} rows={2} />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Relations */}
          <TabsContent value="relations">
            <div className="space-y-8">
              {/* Associate Client */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Associate Client</Label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, phone, email, or TAN…"
                    value={clientSearch}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    className="pl-8"
                    id="client-search"
                  />
                </div>
                {fuzzyWarning && (
                  <p className="text-xs font-sans text-chart-3 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {fuzzyWarning}
                  </p>
                )}
                {clientSuggestions.length > 0 && (
                  <div className="border border-border rounded-[var(--radius-sm)] bg-card shadow-sm divide-y divide-border">
                    {clientSuggestions.map((c) => (
                      <button
                        key={c.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => linkClient(c.id)}
                      >
                        <UserPlus size={14} className="text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-sans text-foreground font-medium">{c.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{c.phone} · {c.email}</p>
                        </div>
                        {form.clientIds.includes(c.id) && <Badge variant="accent">Linked</Badge>}
                      </button>
                    ))}
                  </div>
                )}
                {linkedClients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {linkedClients.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-sans">
                        <span>{c.name}</span>
                        <button onClick={() => unlinkClient(c.id)} className="ml-1 hover:text-destructive transition-colors" aria-label={`Unlink ${c.name}`}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {linkedClients.length === 0 && !clientSearch && (
                  <p className="text-xs font-sans text-muted-foreground">No clients linked. Search above to associate a client.</p>
                )}
              </div>

              {/* Associate Advocate */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Associate Advocate</Label>
                <div className="flex flex-wrap gap-2">
                  {advocates.map((adv) => {
                    const linked = form.advocateIds.includes(adv.id);
                    return (
                      <button
                        key={adv.id}
                        onClick={() => {
                          if (linked) updateDirect('advocateIds', form.advocateIds.filter((id) => id !== adv.id));
                          else updateDirect('advocateIds', [...form.advocateIds, adv.id]);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-sans border transition-colors',
                          linked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {adv.name} ({adv.role})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
