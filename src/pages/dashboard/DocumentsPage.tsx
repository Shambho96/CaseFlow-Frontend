import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FolderPlus, FileText, Folder, ChevronRight, ChevronDown, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Label } from '@/components/ui/label';
import { documents } from '@/mocks/documents';
import { useCases } from '@/store/caseStore';
import { formatFileSize, cn } from '@/lib/utils';
import type { DocumentFile } from '@/types';

const AI_DRAFT_TYPES = ['Legal Notice', 'Plaint', 'Written Statement', 'Summarization', 'Bail Application'];

const MOCK_DRAFT = `IN THE BOMBAY HIGH COURT OF JUDICATURE AT BOMBAY
ORDINARY ORIGINAL CIVIL JURISDICTION

WRIT PETITION NO. ___ OF 2024

IN THE MATTER OF:
Ramesh Kumar Sharma                    ...PETITIONER

VERSUS

Municipal Corporation of Greater Mumbai ...RESPONDENT

LEGAL NOTICE

To,
The Municipal Commissioner,
Municipal Corporation of Greater Mumbai,
Mumbai - 400001.

SUB: Legal Notice under Section 80 of the Code of Civil Procedure, 1908.

Dear Sir/Madam,

I, Adv. Nikhil Joshi, on behalf of my client Shri Ramesh Kumar Sharma, hereby put you on notice of the following:

1. That my client is the lawful owner of the property bearing Survey No. 123/4 situated at Shivaji Nagar, Pune – 411005.

2. That the Respondent Corporation has, without any lawful authority or notice, taken possession of a portion of the said property measuring approximately 200 sq. mtrs.

3. That my client calls upon you to restore possession of the aforesaid portion of land within 60 (sixty) days of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings before the competent court, at your cost and risk.

Dated this 22nd day of August, 2026.

Adv. Nikhil Joshi
Bar Council No: MH/1234/2010`;

function FileNode({ file, depth = 0 }: { file: DocumentFile; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = file.type === 'folder';

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted/50 transition-colors group',
          depth > 0 && `ml-${depth * 4}`
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => isFolder && setExpanded(!expanded)}
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
        <span className="text-xs font-sans text-foreground flex-1 truncate">{file.name}</span>
        {!isFolder && file.size && (
          <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {formatFileSize(file.size)}
          </span>
        )}
        {!isFolder && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
            onClick={(e) => e.stopPropagation()}
            aria-label="Download"
          >
            <Download size={11} />
          </Button>
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
              <FileNode key={child.id} file={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DocumentsPage() {
  const { cases } = useCases();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draftType, setDraftType] = useState('Legal Notice');
  const [draftCase, setDraftCase] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleMockUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setUploadProgress(null), 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedDraft('');
    await new Promise((r) => setTimeout(r, 1500));
    setGenerating(false);
    setGeneratedDraft(MOCK_DRAFT);
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm font-sans text-muted-foreground">File repository and AI-powered drafter</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="case">Case Documents</TabsTrigger>
          <TabsTrigger value="ai">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1 py-0.5 rounded-sm leading-none">AI</span>
              AI Drafter
            </span>
          </TabsTrigger>
        </TabsList>

        {/* General / Case Documents */}
        {(['general', 'case'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* File tree */}
              <div className="lg:col-span-2 bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-sans font-semibold text-foreground">Files</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                      <FolderPlus size={13} /> New Folder
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleMockUpload}>
                      <Upload size={13} /> Upload
                    </Button>
                  </div>
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
                <div className="py-2">
                  {documents
                    .filter((d) => tab === 'general' ? d.category === 'General' : d.category === 'Case')
                    .map((doc) => (
                      <FileNode key={doc.id} file={doc} />
                    ))}
                </div>
              </div>

              {/* Upload drop zone */}
              <div className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleMockUpload(); }}
                  className={cn(
                    'border-2 border-dashed rounded-[var(--radius)] p-8 text-center transition-colors cursor-pointer',
                    dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                  onClick={handleMockUpload}
                >
                  <Upload size={28} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-sans font-medium text-foreground">Drop files here</p>
                  <p className="text-xs font-sans text-muted-foreground mt-1">PDF, DOCX, XLSX supported</p>
                  <Button variant="outline" size="sm" className="mt-4">Browse</Button>
                </div>
                <div className="bg-card border border-border rounded-[var(--radius)] p-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Quick Stats</p>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Total Files</span>
                    <span className="font-mono">11</span>
                  </div>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Case Folders</span>
                    <span className="font-mono">3</span>
                  </div>
                  <div className="flex justify-between text-xs font-sans text-muted-foreground">
                    <span>Storage Used</span>
                    <span className="font-mono">8.4 MB</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}

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
                  <Select value={draftType} onValueChange={setDraftType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AI_DRAFT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Link to Case <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Select value={draftCase} onValueChange={setDraftCase}>
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
                <p>Select a draft type and optionally link a case. The AI uses your case details to draft a document following Indian legal conventions.</p>
                <p className="text-[11px]">Note: Always review AI-generated drafts before use. This is a drafting aid, not legal advice.</p>
              </div>
            </div>

            {/* Draft preview */}
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-sans font-semibold text-foreground">Draft Preview</span>
                {generatedDraft && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                    <Download size={12} /> Download DOCX
                  </Button>
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
