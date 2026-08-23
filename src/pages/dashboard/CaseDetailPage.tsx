import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, AlertCircle, Search, X, UserPlus, Tag,
  Building2, FileText, Users, Gavel, Layers, Flag, Link2,
  CalendarClock, CheckCircle2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useToast } from '@/store/toastStore';
import { fuzzyMatch, formatDate, cn } from '@/lib/utils';
import type { Case, CaseStatus } from '@/types';
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
  labelIds: [],
  customFieldValues: {},
};

const STATUS_BADGE: Record<CaseStatus, 'pending' | 'awaited' | 'decided' | 'abandoned'> = {
  Pending: 'pending',
  Awaited: 'awaited',
  Decided: 'decided',
  Abandoned: 'abandoned',
};

export function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateCase, addCase, getCase, labels, customFields } = useCases();
  const { clients, searchClients } = useClients();
  const { toast } = useToast();

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
    updateDirect('clientIds', form.clientIds.filter((cid) => cid !== clientId));
  };

  const handleSave = () => {
    if (isNew) {
      const newId = `case-${Date.now()}`;
      addCase({ ...form, id: newId } as Case);
      toast('New case created.');
      navigate(`/dashboard/cases/${newId}`);
    } else if (id) {
      updateCase(id, form);
      toast('Case saved.');
    }
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleLabel = (labelId: string) => {
    const current = form.labelIds ?? [];
    updateDirect('labelIds', current.includes(labelId) ? current.filter((l) => l !== labelId) : [...current, labelId]);
  };

  // ── Derived display data ──────────────────────────────────────────────────
  const nextDateInfo = useMemo(() => {
    if (!form.nextDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nd = new Date(form.nextDate + 'T00:00:00');
    const diff = Math.round((nd.getTime() - today.getTime()) / 86400000);
    return {
      diff,
      label: diff === 0 ? 'Hearing Today' : diff === 1 ? 'Tomorrow' : diff > 1 ? `in ${diff} days` : `${Math.abs(diff)}d overdue`,
      overdue: diff < 0,
      soon: diff >= 0 && diff <= 2,
    };
  }, [form.nextDate]);

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
      <div className="sticky top-0 z-30 bg-card/85 backdrop-blur border-b border-border shadow-sm px-6 py-2.5 flex items-center gap-3 no-print">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/dashboard/cases')} aria-label="Back">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/dashboard/cases" className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors shrink-0 hidden sm:inline">Cases</Link>
          <span className="text-muted-foreground/50 hidden sm:inline">/</span>
          <h1 className="font-serif text-base font-semibold text-foreground truncate">
            {isNew ? 'New Case' : (
              <>
                <span className="font-mono text-primary">{form.caseNo || '(unnumbered)'}</span>
                <span className="text-muted-foreground font-sans text-sm"> · </span>
                <span className="text-sm">{form.firstParty || '—'} <span className="text-muted-foreground">v.</span> {form.oppositeParty || '—'}</span>
              </>
            )}
          </h1>
        </div>
        {isDirty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden sm:flex items-center gap-1.5 text-[11px] font-sans text-chart-3 bg-chart-3/10 border border-chart-3/20 rounded-full px-2.5 py-1">
            <AlertCircle size={12} />
            Unsaved changes
          </motion.div>
        )}
        {saved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[11px] font-sans text-chart-1 bg-chart-1/10 border border-chart-1/20 rounded-full px-2.5 py-1">
            <CheckCircle2 size={12} /> Saved
          </motion.div>
        )}
        <Button onClick={handleSave} disabled={!isDirty} className="gap-1.5 h-8">
          <Save size={14} />
          {isNew ? 'Create Case' : 'Save Changes'}
        </Button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-5 mb-5"
        >
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-[var(--radius-sm)] bg-primary/10 flex items-center justify-center shrink-0">
              <Gavel size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/15 rounded-full px-2.5 py-0.5">
                  {form.caseNo || 'Unnumbered'}
                </span>
                {!isNew && <Badge variant={STATUS_BADGE[form.status]}>{form.status}</Badge>}
                <Badge variant="outline">{form.category}</Badge>
                {nextDateInfo && (
                  <Badge
                    variant={nextDateInfo.overdue ? 'destructive' : nextDateInfo.soon ? 'high' : 'muted'}
                    className="gap-1"
                  >
                    <CalendarClock size={10} /> {nextDateInfo.label}
                  </Badge>
                )}
              </div>
              <p className="font-serif text-lg font-semibold text-foreground leading-snug">
                {form.firstParty || '[First Party]'} <span className="text-muted-foreground font-normal italic">v.</span> {form.oppositeParty || '[Opposite Party]'}
              </p>
              <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] font-sans text-muted-foreground">
                {form.courtName && (
                  <span className="inline-flex items-center gap-1"><Building2 size={11} /> {form.courtName}{form.courtNo ? ` · Ct. ${form.courtNo}` : ''}</span>
                )}
                {form.judgeName && <span>⚖ {form.judgeName}</span>}
                {form.stage && <span className="inline-flex items-center gap-1"><Layers size={11} /> {form.stage}</span>}
              </div>
            </div>

            {/* Key dates mini-grid */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              {[
                { label: 'Filed', date: form.filedDate },
                { label: 'Prev', date: form.prevDate },
                { label: 'Next', date: form.nextDate },
              ].map((d) => (
                <div key={d.label} className="bg-muted/50 border border-border rounded-[var(--radius-sm)] px-3 py-2 text-center min-w-20">
                  <p className="text-[9px] font-sans uppercase tracking-wide text-muted-foreground">{d.label}</p>
                  <p className="font-mono text-[11px] text-foreground mt-0.5">{formatDate(d.date)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main grid: tabs + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
          {/* Form sections */}
          <Tabs defaultValue="court">
            <TabsList className="w-full h-auto flex-wrap justify-start bg-card border border-border p-1 mb-1">
              <TabsTrigger value="court" className="gap-1.5 text-xs"><Building2 size={13} /> Court</TabsTrigger>
              <TabsTrigger value="case" className="gap-1.5 text-xs"><FileText size={13} /> Case IDs</TabsTrigger>
              <TabsTrigger value="litigants" className="gap-1.5 text-xs"><Users size={13} /> Litigants</TabsTrigger>
              {form.category === 'Criminal' && <TabsTrigger value="criminal" className="gap-1.5 text-xs"><Gavel size={13} /> Criminal</TabsTrigger>}
              <TabsTrigger value="stage" className="gap-1.5 text-xs"><Layers size={13} /> Stage</TabsTrigger>
              <TabsTrigger value="status" className="gap-1.5 text-xs"><Flag size={13} /> Status</TabsTrigger>
              <TabsTrigger value="relations" className="gap-1.5 text-xs"><Link2 size={13} /> Relations</TabsTrigger>
            </TabsList>

            {/* Court Identifiers */}
            <TabsContent value="court">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
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
              </div>
            </TabsContent>

            {/* Case Identifiers */}
            <TabsContent value="case">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
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
                    <Label htmlFor="referenceNo">Reference No.</Label>
                    <Input id="referenceNo" value={form.referenceNo ?? ''} onChange={update('referenceNo')} placeholder="REF/2024/091" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fileNo">File No.</Label>
                    <Input id="fileNo" value={form.fileNo ?? ''} onChange={update('fileNo')} placeholder="FILE/1123/A" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fileName">File Name</Label>
                    <Input id="fileName" value={form.fileName ?? ''} onChange={update('fileName')} placeholder="Sharma Property Dispute" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" value={form.year ?? ''} onChange={update('year')} placeholder="2024" className="font-mono" maxLength={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="filedDate">Date Filed</Label>
                    <Input id="filedDate" type="date" value={form.filedDate} onChange={update('filedDate')} className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company Name <span className="text-muted-foreground text-xs">(corporate)</span></Label>
                    <Input id="companyName" value={form.companyName ?? ''} onChange={update('companyName')} placeholder="Deshmukh Textiles Pvt Ltd" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={form.notes ?? ''} onChange={update('notes')} placeholder="Any background notes…" rows={3} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Litigants */}
            <TabsContent value="litigants">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstParty">First Party <span className="text-muted-foreground text-xs">(Petitioner / Plaintiff)</span></Label>
                    <Input id="firstParty" value={form.firstParty} onChange={update('firstParty')} placeholder="Ramesh Kumar Sharma" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oppositeParty">Opposite Party <span className="text-muted-foreground text-xs">(Respondent / Defendant)</span></Label>
                    <Input id="oppositeParty" value={form.oppositeParty} onChange={update('oppositeParty')} placeholder="Municipal Corporation" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Criminal Specifics */}
            {form.category === 'Criminal' && (
              <TabsContent value="criminal">
                <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
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
                      <Label htmlFor="sections">Sections Applied <span className="text-muted-foreground text-xs">(IPC/BNS)</span></Label>
                      <Input id="sections" value={form.sections ?? ''} onChange={update('sections')} placeholder="IPC 406, 420" className="font-mono" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Stage & Lifecycle */}
            <TabsContent value="stage">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
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
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="empanelment">Empanelment</Label>
                    <Select
                      value={form.empanelment ?? 'None'}
                      onValueChange={(v) => updateDirect('empanelment', v)}
                    >
                      <SelectTrigger id="empanelment"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Insurance Panel">Insurance Panel</SelectItem>
                        <SelectItem value="Bank Panel">Bank Panel</SelectItem>
                        <SelectItem value="Corporate Panel">Corporate Panel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="comments">Comments / Requirements</Label>
                    <Textarea id="comments" value={form.comments ?? ''} onChange={update('comments')} placeholder="Filing requirements, reminders, instructions…" rows={3} />
                  </div>

                  {customFields.length > 0 && (
                    <>
                      <div className="md:col-span-2 pt-2 border-t border-border">
                        <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">Custom Fields</p>
                      </div>
                      {customFields.map((f) => (
                        <div key={f.id} className="space-y-1.5">
                          <Label htmlFor={`cf-${f.id}`}>{f.name}</Label>
                          <Input
                            id={`cf-${f.id}`}
                            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                            value={form.customFieldValues?.[f.id] ?? ''}
                            onChange={(e) => updateDirect('customFieldValues', { ...(form.customFieldValues ?? {}), [f.id]: e.target.value })}
                            className={cn(f.type !== 'text' && 'font-mono')}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Status Controls */}
            <TabsContent value="status">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="status">Lifecycle Status</Label>
                    <Select value={form.status} onValueChange={(v) => {
                      updateDirect('status', v);
                      if (v === 'Decided') updateDirect('decidedDate', form.decidedDate || new Date().toISOString().split('T')[0]);
                    }}>
                      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Awaited">Awaited</SelectItem>
                        <SelectItem value="Decided">Decided</SelectItem>
                        <SelectItem value="Abandoned">Abandoned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-6 pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.status === 'Decided'}
                        onCheckedChange={(v) => {
                          if (v) {
                            updateDirect('status', 'Decided');
                            updateDirect('decidedDate', form.decidedDate || new Date().toISOString().split('T')[0]);
                          } else if (form.status === 'Decided') {
                            updateDirect('status', 'Pending');
                          }
                        }}
                      />
                      <span className="text-sm font-sans text-foreground">Decided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.status === 'Abandoned'}
                        onCheckedChange={(v) => {
                          if (v) {
                            updateDirect('status', 'Abandoned');
                            updateDirect('abandonedDate', form.abandonedDate || new Date().toISOString().split('T')[0]);
                          } else if (form.status === 'Abandoned') {
                            updateDirect('status', 'Pending');
                          }
                        }}
                      />
                      <span className="text-sm font-sans text-foreground">Abandoned</span>
                    </label>
                  </div>
                  {form.status === 'Decided' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="decidedDate">Date Decided</Label>
                        <Input id="decidedDate" type="date" value={form.decidedDate ?? ''} onChange={update('decidedDate')} className="font-mono" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="decisionSummary">Decision Summary</Label>
                        <Textarea id="decisionSummary" value={form.decisionSummary ?? ''} onChange={update('decisionSummary')} rows={3} placeholder="Outcome, directions, costs…" />
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
              </div>
            </TabsContent>

            {/* Relations */}
            <TabsContent value="relations">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 space-y-8">
                {/* Labels */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Tag size={14} /> Case Labels
                  </Label>
                  {labels.length === 0 ? (
                    <p className="text-xs font-sans text-muted-foreground">No labels defined yet. Create them from the Cases page → Actions.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((lbl) => {
                        const linked = (form.labelIds ?? []).includes(lbl.id);
                        return (
                          <button
                            key={lbl.id}
                            onClick={() => toggleLabel(lbl.id)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-sans border transition-colors',
                              linked
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            {lbl.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Associate Client */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <UserPlus size={14} /> Associate Client
                  </Label>
                  <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search by name, phone, email, or TAN…"
                      value={clientSearch}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      className="pl-8 h-9"
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
                    <div className="border border-border rounded-[var(--radius-sm)] bg-card shadow-sm divide-y divide-border max-w-md">
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
                  <Label className="text-sm font-semibold">Associate Advocate</Label>
                  <div className="flex flex-wrap gap-2">
                    {advocates.map((adv) => {
                      const linked = form.advocateIds.includes(adv.id);
                      return (
                        <button
                          key={adv.id}
                          onClick={() => {
                            if (linked) updateDirect('advocateIds', form.advocateIds.filter((aid) => aid !== adv.id));
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

          {/* Sidebar */}
          <aside className="space-y-4 xl:sticky xl:top-20 no-print">
            {/* Next hearing card */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  'h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center',
                  nextDateInfo?.overdue ? 'bg-destructive/15' : nextDateInfo?.soon ? 'bg-chart-3/15' : 'bg-primary/10'
                )}>
                  <CalendarClock size={15} className={cn(
                    nextDateInfo?.overdue ? 'text-destructive' : nextDateInfo?.soon ? 'text-chart-3' : 'text-primary'
                  )} />
                </span>
                <p className="text-sm font-sans font-semibold text-foreground">Next Hearing</p>
              </div>
              {form.nextDate ? (
                <>
                  <p className="font-mono text-lg font-semibold text-foreground">{formatDate(form.nextDate)}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant={nextDateInfo!.overdue ? 'destructive' : nextDateInfo!.soon ? 'high' : 'muted'} className="text-[10px]">
                      {nextDateInfo!.label}
                    </Badge>
                    {form.fixedFor && <Badge variant="accent" className="text-[10px]">{form.fixedFor}</Badge>}
                  </div>
                  {form.courtName && (
                    <p className="text-[11px] font-sans text-muted-foreground mt-2">
                      {form.courtName}{form.courtNo ? ` · Court No. ${form.courtNo}` : ''}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs font-sans text-muted-foreground">
                  No date fixed yet — this matter is <span className="text-accent-foreground font-medium">awaiting</span> its next listing.
                </p>
              )}
            </div>

            {/* Labels dropdown picker */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-primary" />
                  <p className="text-sm font-sans font-semibold text-foreground">Quick Labels</p>
                </div>
                {(form.labelIds ?? []).length > 0 && (
                  <Badge variant="muted" className="font-mono text-[10px]">{(form.labelIds ?? []).length}</Badge>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={labels.length === 0}>
                  <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs font-normal">
                    <span className="truncate">
                      {(form.labelIds ?? []).length === 0
                        ? (labels.length === 0 ? 'No labels available' : 'Choose labels…')
                        : labels.filter((l) => (form.labelIds ?? []).includes(l.id)).map((l) => l.name).join(', ')}
                    </span>
                    <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Select labels</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {labels.map((lbl) => (
                    <DropdownMenuCheckboxItem
                      key={lbl.id}
                      checked={(form.labelIds ?? []).includes(lbl.id)}
                      onCheckedChange={() => toggleLabel(lbl.id)}
                    >
                      {lbl.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {labels.length === 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Create labels from Cases → Actions.</p>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
