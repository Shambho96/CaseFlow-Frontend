import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FolderPlus, FileText, Folder, ChevronRight, ChevronDown,
  Sparkles, Download, Copy, Search, Trash2, Users, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { documents as mockDocuments } from '@/mocks/documents';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useToast } from '@/store/toastStore';
import { useUI } from '@/store/uiStore';
import { scopedCaseIdSet } from '@/lib/scope';
import { formatFileSize, getInitials, cn } from '@/lib/utils';
import { downloadTextFile } from '@/lib/exporters';
import type { DocumentFile, Case } from '@/types';

const AI_DRAFT_TYPES = ['Legal Notice', 'Plaint', 'Written Statement', 'Bail Application', 'Case Summarization'];

const LS_KEY = 'lawcaseflow-documents';

function loadDocs(): DocumentFile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as DocumentFile[];
  } catch { /* ignore */ }
  return mockDocuments;
}

/** Module-scope id generator so event handlers stay pure per lint */
let idSeq = 0;
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

// ── Recursive tree helpers ───────────────────────────────────────────────────

function addChildUnder(list: DocumentFile[], parentId: string, child: DocumentFile): DocumentFile[] {
  return list.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] };
    if (n.children) return { ...n, children: addChildUnder(n.children, parentId, child) };
    return n;
  });
}

function pruneNode(list: DocumentFile[], id: string): DocumentFile[] {
  return list
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: pruneNode(n.children, id) } : n));
}

function findNode(list: DocumentFile[], id: string): DocumentFile | null {
  for (const n of list) {
    if (n.id === id) return n;
    if (n.children) {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Filter tree by query */
function filterTree(files: DocumentFile[], q: string): DocumentFile[] {
  if (!q.trim()) return files;
  const lower = q.toLowerCase();
  return files.reduce<DocumentFile[]>((acc, f) => {
    if (f.type === 'folder') {
      const kids = filterTree(f.children ?? [], q);
      if (kids.length > 0 || f.name.toLowerCase().includes(lower)) {
        acc.push({ ...f, children: kids });
      }
    } else if (f.name.toLowerCase().includes(lower)) {
      acc.push(f);
    }
    return acc;
  }, []);
}

// ── AI Draft Templates ───────────────────────────────────────────────────────

function buildDraft(type: string, c: Case | null): string {
  const courtHeader = c ? c.courtName.toUpperCase() : "THE HON'BLE HIGH COURT";
  const parties = c ? `${c.firstParty}                    ...PETITIONER/PLAINTIFF\n\nVERSUS\n\n${c.oppositeParty} ...RESPONDENT/DEFENDANT` : '[PETITIONER] VERSUS [RESPONDENT]';
  const caseNoLine = c && c.caseNo ? `CASE NO. ${c.caseNo}` : 'CASE NO. ___ OF ____';

  switch (type) {
    case 'Legal Notice':
      return `IN THE ${courtHeader}
${caseNoLine}

IN THE MATTER OF:
${parties}

LEGAL NOTICE

To,
${c?.oppositeParty ?? '[Addressee]'}

SUB: ${c ? `Notice in respect of matter No. ${c.caseNo}` : 'Subject of the notice'}

Dear Sir/Madam,

I, Adv. Nikhil Joshi, on behalf of my client ${c?.firstParty ?? '[Client Name]'}, hereby put you on notice of the following:

1. That my client has a bona fide claim arising out of the dealings between the parties more particularly described herein.

2. That despite repeated requests and reminders, you have failed to comply with your lawful obligations towards my client.

3. That my client hereby calls upon you to remedy the default within 15 (fifteen) days of receipt of this notice, failing which appropriate legal proceedings shall be initiated before the competent court/forum at your cost and risk.

A copy of this notice is retained in my office for further necessary action.

Dated this ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.

Adv. Nikhil Joshi
Bar Council No: MH/1234/2010`;

    case 'Plaint':
      return `IN THE ${courtHeader}
ORDINARY ORIGINAL CIVIL JURISDICTION

${c ? c.caseNo : 'SUIT NO. ___ OF ____'}

${parties}

PLAIN UNDER ORDER VII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908

1. The Plaintiff submits that the cause of action for the present suit arose at ${c?.courtName ?? '[Place]'} within the jurisdiction of this Hon'ble Court.

2. The facts constituting the cause of action are as follows: ${c?.notes || '[Set out the material facts and sequence of events.]'}

3. That the present suit is filed for reliefs of declaration, recovery and perpetual injunction as enumerated in the prayer clause hereunder.

PRAYER:
(a) Declare the rights of the Plaintiff as stated above;
(b) Direct the Defendant to pay ₹[amount] along with interest;
(c) Grant perpetual injunction restraining the Defendant;
(d) Award costs of the suit.

Place: ${c?.courtName ?? '[Place]'}                                        Adv. Nikhil Joshi
Date: ${new Date().toLocaleDateString('en-IN')}`;

    case 'Written Statement':
      return `IN THE ${courtHeader}

${c ? c.caseNo : 'SUIT NO. ___ OF ____'}

${parties}

WRITTEN STATEMENT UNDER ORDER VIII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908
ON BEHALF OF THE DEFENDANT / RESPONDENT

1. The Respondent denies each and every allegation contained in the plaint, except what is expressly admitted hereinbelow.

2. Preliminary Submissions: The present suit is bad in law, is barred by limitation, and the plaint does not disclose any cause of action against the answering Respondent.

3. On Merits: ${c ? `With reference to matter No. ${c.caseNo}, the transaction between the parties stands concluded and discharged. ` : ''}[Para-wise reply to be inserted.]

4. The Respondent craves leave of this Hon'ble Court to rely upon documents and evidence at the time of trial.

PRAYER:
It is therefore most respectfully prayed that this Hon'ble Court may dismiss the suit with exemplary costs.

Place: ${c?.courtName ?? '[Place]'}                                        Adv. Nikhil Joshi
Date: ${new Date().toLocaleDateString('en-IN')}`;

    case 'Bail Application':
      return `IN THE ${courtHeader}

BAIL APPLICATION NO. ___ OF ____
(Criminal)

IN THE MATTER OF:
${parties}

APPLICATION UNDER SECTION 437 / 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973 FOR REGULAR BAIL

1. The Applicant/accused has been falsely implicated in ${c ? `FIR No. ${c.firNo ?? '[FIR No.]'}, PS ${c.policeStation ?? '[Police Station]'}, under sections ${c.sections ?? '[Sections]'}, registered as ${c.caseNo}.` : 'the present FIR.'}

2. The investigation is complete / the Applicant cooperated fully; custodial interrogation serves no useful purpose.

3. The Applicant is a permanent resident, has deep roots in society, poses no flight risk, and undertakes to abide by all conditions imposed by this Hon'ble Court.

4. Several co-accused on similar parity have already been released on bail.

PRAYER:
It is therefore prayed that the Applicant be released on bail on such terms and conditions as this Hon'ble Court deems fit.

Place: ${c?.courtName ?? '[Place]'}                                        Adv. Nikhil Joshi
Date: ${new Date().toLocaleDateString('en-IN')}`;

    case 'Case Summarization':
    default:
      return `CASE SUMMARY
════════════════════════════════════════

Case No.:        ${c?.caseNo ?? '—'}
Court:           ${c ? `${c.courtName} (Court No. ${c.courtNo})` : '—'}
Judge:           ${c?.judgeName ?? '—'}
Category:        ${c?.category ?? '—'}
Status:          ${c?.status ?? '—'}
Filed On:        ${c?.filedDate ?? '—'}
Previous Date:   ${c?.prevDate ?? '—'}
Next Date:       ${c?.nextDate ?? '—'} (${c?.fixedFor ?? '—'})
Parties:         ${c ? `${c.firstParty} v. ${c.oppositeParty}` : '—'}
${c?.firNo ? `FIR:            ${c.firNo}, PS ${c.policeStation}, Sections ${c.sections}\n` : ''}
BACKGROUND:
${c?.notes || '[Background notes will appear here once recorded against the case.]'}

CURRENT STAGE:   ${c?.stage ?? '—'}
${c?.decisionSummary ? `\nDECISION:\n${c.decisionSummary}` : ''}
${c?.comments ? `\nREQUIREMENTS / COMMENTS:\n${c.comments}` : ''}`;
  }
}

// ── File Tree Node ───────────────────────────────────────────────────────────

function FileNode({
  file,
  depth = 0,
  targetId,
  onSetTarget,
  onDelete,
}: {
  file: DocumentFile;
  depth?: number;
  targetId: string | null;
  onSetTarget: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = file.type === 'folder';
  const isTarget = targetId === file.id;

  const handleFolderClick = () => {
    setExpanded(!expanded);
    if (isFolder) onSetTarget(file.id);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-[var(--radius-sm)] cursor-pointer group transition-colors',
          isFolder && isTarget ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleFolderClick}
      >
        {isFolder ? (
          <>
            {expanded ? <ChevronDown size={13} className="text-muted-foreground shrink-0" /> : <ChevronRight size={13} className="text-muted-foreground shrink-0" />}
            <Folder size={14} className="text-chart-3 shrink-0" />
          </>
        ) : (
          <>
            <span className="w-[13px] shrink-0" />
            <FileText size={14} className="text-muted-foreground shrink-0" />
          </>
        )}
        <span className="text-xs font-sans flex-1 truncate">{file.name}</span>
        {!isFolder && file.size && (
          <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {formatFileSize(file.size)}
          </span>
        )}
        {!isFolder && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={(e) => e.stopPropagation()}
              aria-label="Download"
            >
              <Download size={11} />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                aria-label="Delete"
              >
                <Trash2 size={11} />
              </Button>
            )}
          </>
        )}
      </div>
      <AnimatePresence>
        {isFolder && expanded && file.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {file.children.map((child) => (
              <FileNode key={child.id} file={child} depth={depth + 1} targetId={targetId} onSetTarget={onSetTarget} onDelete={onDelete} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DocumentsPage() {
  const { cases } = useCases();
  const { clients: allClients } = useClients();
  const { toast } = useToast();
  const { scope } = useUI();

  const [docs, setDocs] = useState<DocumentFile[]>(loadDocs);
  const [searchQ, setSearchQ] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Upload targeting per tab — files land inside the clicked folder
  const [uploadTargets, setUploadTargets] = useState<Record<string, string>>({
    general: 'doc-root-general',
    client: '',
  });
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');

  const [draftType, setDraftType] = useState('Legal Notice');
  const [draftCaseId, setDraftCaseId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const generalInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const persistDocs = (next: DocumentFile[]) => {
    setDocs(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  // Scope-aware client list
  const scopedIds = useMemo(() => scopedCaseIdSet(cases, scope), [cases, scope]);
  const scopedClients = useMemo(() => {
    if (scope.kind === 'all' || !scope.value) return allClients;
    return allClients.filter((c) => c.caseIds.some((id) => scopedIds.has(id)));
  }, [allClients, scope, scopedIds]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    if (!q) return scopedClients;
    return scopedClients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [scopedClients, clientSearch]);

  useEffect(() => {
    if (!selectedClientId && scopedClients.length > 0) setSelectedClientId(scopedClients[0].id);
  }, [selectedClientId, scopedClients.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ensure root + per-client folder exist; returns updated docs */
  const ensureClientFolders = (list: DocumentFile[], clientId: string): DocumentFile[] => {
    let next = [...list];
    if (!next.find((d) => d.id === 'doc-root-clients')) {
      next.push({
        id: 'doc-root-clients',
        name: 'Client Documents',
        type: 'folder',
        category: 'Client',
        createdAt: new Date().toISOString().split('T')[0],
        children: [],
      });
    }
    const client = allClients.find((c) => c.id === clientId);
    const folderId = `cli-docs-${clientId}`;
    const root = next.find((d) => d.id === 'doc-root-clients');
    if (client && root && !(root.children ?? []).some((ch) => ch.id === folderId)) {
      next = addChildUnder(next, 'doc-root-clients', {
        id: folderId,
        name: client.name,
        type: 'folder',
        category: 'Client',
        clientId,
        parentId: 'doc-root-clients',
        createdAt: new Date().toISOString().split('T')[0],
        children: [],
      });
    }
    return next;
  };

  const activeClientId = selectedClientId || scopedClients[0]?.id || '';
  const clientDocsReady = useMemo(
    () => (activeClientId ? ensureClientFolders(docs, activeClientId) : docs),
    [docs, activeClientId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setUploadTargets((p) => ({ ...p, client: `cli-docs-${clientId}` }));
    persistDocs(ensureClientFolders(docs, clientId));
  };

  // ── Folder & upload operations ────────────────────────────────────────────

  const createFolder = (tabKey: 'general' | 'client') => {
    if (tabKey === 'client') {
      if (!activeClientId) return;
      const base = ensureClientFolders(docs, activeClientId);
      const parent = uploadTargets.client || `cli-docs-${activeClientId}`;
      const counter = genId('folder');
      persistDocs(addChildUnder(base, parent, {
        id: counter,
        name: 'New Folder',
        type: 'folder',
        category: 'Client',
        clientId: activeClientId,
        parentId: parent,
        createdAt: new Date().toISOString().split('T')[0],
        children: [],
      }));
      toast('Folder created inside selected client.');
      return;
    }
    const rootKey = 'doc-root-general';
    const parent = uploadTargets.general || rootKey;
    const rootNode = findNode(docs, parent) ?? findNode(docs, rootKey)!;
    const siblings = (rootNode.children ?? []).map((c) => c.name);
    let counter = 1;
    while (siblings.includes(`New Folder${counter > 1 ? ` (${counter - 1})` : ''}`)) counter++;
    persistDocs(addChildUnder(docs, rootNode.id, {
      id: genId('folder'),
      name: `New Folder${counter > 1 ? ` (${counter - 1})` : ''}`,
      type: 'folder',
      category: 'General',
      parentId: rootNode.id,
      createdAt: new Date().toISOString().split('T')[0],
      children: [],
    }));
    toast('Folder created.');
  };

  const handleFilesSelected = (files: FileList | null, tabKey: 'general' | 'client') => {
    if (!files || files.length === 0) return;
    const category = tabKey === 'general' ? 'General' : 'Client';
    let base = docs;
    let parentId: string;
    if (tabKey === 'client') {
      if (!activeClientId) return;
      base = ensureClientFolders(docs, activeClientId);
      parentId = uploadTargets.client || `cli-docs-${activeClientId}`;
    } else {
      parentId = uploadTargets.general;
    }
    const parentNode = findNode(base, parentId) ?? findNode(base, 'doc-root-general');
    if (!parentNode) return;

    const newFiles: DocumentFile[] = Array.from(files).slice(0, 10).map((f, i) => ({
      id: genId(`file-${i}`),
      name: f.name,
      type: 'file',
      mimeType: f.type,
      size: f.size,
      category,
      parentId: parentNode.id,
      createdAt: new Date().toISOString().split('T')[0],
    }));

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) { clearInterval(interval); return null; }
        if (prev >= 100) {
          clearInterval(interval);
          let withFiles = base;
          newFiles.forEach((nf) => { withFiles = addChildUnder(withFiles, parentNode.id, nf); });
          persistDocs(withFiles);
          setTimeout(() => setUploadProgress(null), 600);
          toast(`${newFiles.length} file(s) uploaded.`);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const deleteDoc = (id: string) => {
    persistDocs(pruneNode(docs, id));
    toast('Deleted.', 'info');
  };

  // ── AI Draft ──────────────────────────────────────────────────────────────
  const linkedCase = cases.find((c) => c.id === draftCaseId) ?? null;

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedDraft('');
    await new Promise((r) => setTimeout(r, 1400));
    setGenerating(false);
    setGeneratedDraft(buildDraft(draftType, linkedCase));
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generatedDraft).then(
      () => toast('Draft copied to clipboard.'),
      () => toast('Could not access clipboard.', 'error')
    );
  };

  const handleDownloadTxt = () => {
    downloadTextFile(generatedDraft, `${draftType.replace(/\s+/g, '-')}${linkedCase ? `-${linkedCase.caseNo.replace(/[^\w]/g, '-')}` : ''}.txt`);
    toast('Draft downloaded.');
  };

  const stats = useMemo(() => {
    const countAll = (list: DocumentFile[]): number =>
      list.reduce((n, f) => n + (f.type === 'file' ? 1 : countAll(f.children ?? [])), 0);
    const sizeAll = (list: DocumentFile[]): number =>
      list.reduce((s, f) => s + (f.size ?? 0) + sizeAll(f.children ?? []), 0);
    return {
      totalFiles: countAll(docs),
      storage: formatFileSize(sizeAll(docs)),
    };
  }, [docs]);

  const targetNameOf = (key: 'general' | 'client'): string => {
    const tid = key === 'client'
      ? (uploadTargets.client || (activeClientId ? `cli-docs-${activeClientId}` : ''))
      : uploadTargets.general;
    const node = tid ? findNode(docs, tid) : null;
    return node?.name ?? 'Root';
  };

  const renderUploadBar = (tabKey: 'general' | 'client', inputRef: React.RefObject<HTMLInputElement | null>) => (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="accent" className="text-[9px] gap-1">
        <FolderOpen size={9} /> Uploads go to: <span className="font-medium">{targetNameOf(tabKey)}</span>
      </Badge>
      <span className="text-[10px] font-sans text-muted-foreground">click a folder to change</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { handleFilesSelected(e.target.files, tabKey); e.target.value = ''; }}
      />
    </div>
  );

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm font-sans text-muted-foreground">File repository, client-wise folders and AI-powered drafter</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="clients">
            <span className="flex items-center gap-1.5">
              <Users size={12} /> Client Folders
            </span>
          </TabsTrigger>
          <TabsTrigger value="ai">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1 py-0.5 rounded-sm leading-none">AI</span>
              AI Drafter
            </span>
          </TabsTrigger>
        </TabsList>

        {/* General Documents */}
        {(['general'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* File tree */}
              <div className="lg:col-span-2 bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2 flex-wrap">
                  <span className="text-sm font-sans font-semibold text-foreground">Files</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search documents…"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        className="pl-7 h-7 w-40 text-xs"
                      />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => createFolder(tab)}>
                      <FolderPlus size={13} /> New Folder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => generalInputRef.current?.click()}
                    >
                      <Upload size={13} /> Upload
                    </Button>
                  </div>
                </div>
                <div className="px-4 py-2 border-b border-border bg-muted/20">
                  {renderUploadBar(tab, generalInputRef)}
                </div>
                {uploadProgress !== null && (
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between text-xs font-sans text-muted-foreground mb-1">
                      <span>Uploading…</span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                )}
                <div className="py-2 max-h-[420px] overflow-y-auto">
                  {filterTree(
                    docs.filter((d) => d.category === 'General'),
                    searchQ
                  ).length === 0 ? (
                    <p className="text-sm font-sans text-muted-foreground text-center py-8">
                      {searchQ ? 'No documents match your search.' : 'No documents yet.'}
                    </p>
                  ) : (
                    filterTree(
                      docs.filter((d) => d.category === 'General'),
                      searchQ
                    ).map((doc) => (
                      <FileNode
                        key={doc.id}
                        file={doc}
                        targetId={uploadTargets.general}
                        onSetTarget={(id) => setUploadTargets((p) => ({ ...p, general: id }))}
                        onDelete={deleteDoc}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Upload drop zone */}
              <div className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFilesSelected(e.dataTransfer.files, tab);
                  }}
                  onClick={() => generalInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-[var(--radius)] p-8 text-center transition-colors cursor-pointer',
                    dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  <Upload size={28} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-sans font-medium text-foreground">Drop files here</p>
                  <p className="text-xs font-sans text-muted-foreground mt-1">Lands inside “{targetNameOf(tab)}”</p>
                  <Button variant="outline" size="sm" className="mt-4">Browse</Button>
                </div>
                <div className="bg-card border border-border rounded-[var(--radius)] p-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Quick Stats</p>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Total Files</span>
                    <span className="font-mono">{stats.totalFiles}</span>
                  </div>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Storage Used</span>
                    <span className="font-mono">{stats.storage}</span>
                  </div>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Encryption</span>
                    <span className="font-mono text-chart-1">AES-256</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}

        {/* Client Folders */}
        <TabsContent value="clients">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
            {/* Client list */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden flex flex-col max-h-[560px]">
              <div className="px-4 py-3 border-b border-border space-y-2">
                <p className="text-sm font-sans font-semibold text-foreground">Clients ({filteredClients.length})</p>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search clients…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
              </div>
              <div className="overflow-y-auto py-1 flex-1">
                {filteredClients.map((cl) => (
                  <button
                    key={cl.id}
                    onClick={() => selectClient(cl.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      activeClientId === cl.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                    )}
                  >
                    <span className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      activeClientId === cl.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    )}>
                      {getInitials(cl.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-sans text-foreground truncate">{cl.name}</span>
                      <span className="block text-[10px] font-sans text-muted-foreground">{cl.caseIds.length} case(s)</span>
                    </span>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-xs font-sans text-muted-foreground text-center py-8">No clients found.</p>
                )}
              </div>
            </div>

            {/* Selected client's documents */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-sans font-semibold text-foreground truncate">
                    {allClients.find((c) => c.id === activeClientId)?.name ?? 'Select a client'}
                  </p>
                  <p className="text-[11px] font-sans text-muted-foreground">Personal document vault for this client</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={!activeClientId}
                    onClick={() => createFolder('client')}
                  >
                    <FolderPlus size={13} /> New Folder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={!activeClientId}
                    onClick={() => clientInputRef.current?.click()}
                  >
                    <Upload size={13} /> Upload
                  </Button>
                  <input
                    ref={clientInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => { handleFilesSelected(e.target.files, 'client'); e.target.value = ''; }}
                  />
                </div>
              </div>
              <div className="px-4 py-2 border-b border-border bg-muted/20">
                {renderUploadBar('client', clientInputRef)}
              </div>
              {activeClientId ? (
                <div className="py-2 min-h-[320px] max-h-[420px] overflow-y-auto">
                  {(() => {
                    const folderId = `cli-docs-${activeClientId}`;
                    const clientFolder = findNode(clientDocsReady, folderId);
                    if (!clientFolder || (clientFolder.children ?? []).length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                          <Folder size={28} className="text-muted-foreground/40 mb-3" />
                          <p className="text-sm font-sans text-muted-foreground">No documents yet for this client.</p>
                          <p className="text-xs font-sans text-muted-foreground/70 mt-1">Create a folder or upload files above.</p>
                        </div>
                      );
                    }
                    return clientFolder.children!.map((child) => (
                      <FileNode
                        key={child.id}
                        file={child}
                        depth={0}
                        targetId={uploadTargets.client}
                        onSetTarget={(id) => setUploadTargets((p) => ({ ...p, client: id }))}
                        onDelete={deleteDoc}
                      />
                    ));
                  })()}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm font-sans text-muted-foreground">Select a client from the left.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* AI Drafter */}
        <TabsContent value="ai">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Config panel */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-sm">AI</div>
                  <h2 className="font-sans font-semibold text-foreground text-sm">AI Document Drafter</h2>
                </div>
                <div className="space-y-1.5">
                  <Label>Draft Type</Label>
                  <Select value={draftType} onValueChange={(v) => { setDraftType(v); setGeneratedDraft(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AI_DRAFT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Link to Case <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Select value={draftCaseId} onValueChange={setDraftCaseId}>
                    <SelectTrigger><SelectValue placeholder="Select case…" /></SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNo} — {c.firstParty} v. {c.oppositeParty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full gap-2"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate {draftType}
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-accent/40 border border-border rounded-[var(--radius)] p-4 text-xs font-sans text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">How it works</p>
                <p>Select a draft type and optionally link a case. The drafter pre-fills party names, case numbers, courts and dates from the linked record following Indian legal conventions.</p>
                <p className="text-[11px]">Note: Always review generated drafts before use. This is a drafting aid, not legal advice.</p>
              </div>
            </div>

            {/* Draft preview */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
                <span className="text-sm font-sans font-semibold text-foreground">Draft Preview</span>
                {generatedDraft && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopyDraft}>
                      <Copy size={12} /> Copy
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadTxt}>
                      <Download size={12} /> Download
                    </Button>
                  </div>
                )}
              </div>
              {generatedDraft ? (
                <div className="p-5 max-h-[600px] overflow-y-auto">
                  <pre className="font-mono text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                    {generatedDraft}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                  <Sparkles size={32} className="text-muted-foreground/40 mb-4" />
                  <p className="text-sm font-sans text-muted-foreground">
                    {generating
                      ? 'Generating your document…'
                      : 'Configure options and click Generate to create a draft.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
