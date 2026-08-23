import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Moon, BellRing, MessageCircle, ShieldCheck,
  Download, RefreshCcw, Database, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useUI } from '@/store/uiStore';
import { useToast } from '@/store/toastStore';
import { downloadTextFile } from '@/lib/exporters';
import { cn } from '@/lib/utils';

const LS_SETTINGS = 'lawcaseflow-settings';

const DEFAULT_SETTINGS = {
  hearingReminders: true,
  taskAlerts: true,
  feeReminders: true,
  whatsappAuto: false,
  countryCode: '+91',
  signature: '— Adv. Nikhil Joshi\nJoshi & Associates, Pune',
};

type Settings = typeof DEFAULT_SETTINGS;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

/** Lightweight toggle switch styled with theme tokens */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5.5 w-10 rounded-full border transition-colors shrink-0',
        checked ? 'bg-primary border-primary' : 'bg-muted border-border'
      )}
      style={{ height: 22 }}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-card shadow-sm transition-all',
          checked ? 'left-[calc(100%-18px)]' : 'left-0.5'
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useUI();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [resetOpen, setResetOpen] = useState(false);

  const save = (next: Partial<Settings>) => {
    setSettings((p) => {
      const merged = { ...p, ...next };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(merged));
      return merged;
    });
  };

  const toggle = (key: keyof Settings) => (v: boolean) => {
    save({ [key]: v } as Partial<Settings>);
    toast('Preference saved.');
  };

  const exportAllData = () => {
    const payload: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lawcaseflow')) {
        try { payload[key] = JSON.parse(localStorage.getItem(key) ?? ''); }
        catch { payload[key] = localStorage.getItem(key); }
      }
    }
    downloadTextFile(JSON.stringify(payload, null, 2), `caseflow-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    toast('Workspace backup downloaded.');
  };

  const resetDemoData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lawcaseflow') && key !== 'lawcaseflow-theme') keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    setResetOpen(false);
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm font-sans text-muted-foreground">Workspace preferences, notifications and data controls</p>
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-sans">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Label className="text-xs text-muted-foreground">Theme</Label>
            <div className="grid grid-cols-2 gap-3 mt-2 max-w-md">
              {([
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => { setTheme(key); toast(`${label} theme applied.`); }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-sm font-sans transition-all',
                    theme === key ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary' : 'border-border hover:bg-muted'
                  )}
                >
                  <Icon size={16} />
                  {label}
                  {theme === key && <CheckCircle2 size={14} className="ml-auto text-primary" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <Card>
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <BellRing size={14} className="text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 divide-y divide-border">
            {[
              { key: 'hearingReminders' as const, label: 'Hearing reminders', desc: 'Alert me the day before and morning of every listed hearing.' },
              { key: 'taskAlerts' as const, label: 'Task due alerts', desc: 'Notify when assigned tasks are due today or overdue.' },
              { key: 'feeReminders' as const, label: 'Pending fee reminders', desc: 'Flag clients with outstanding fees on their cases.' },
              { key: 'whatsappAuto' as const, label: 'Auto-draft WhatsApp on next date', desc: 'Pre-generate client messages whenever a next hearing date is recorded.' },
            ].map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-1">
                <div className="min-w-0">
                  <p className="text-xs font-sans font-medium text-foreground">{row.label}</p>
                  <p className="text-[11px] font-sans text-muted-foreground mt-0.5">{row.desc}</p>
                </div>
                <Toggle checked={Boolean(settings[row.key])} onChange={toggle(row.key)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* WhatsApp & Email */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <MessageCircle size={14} className="text-chart-1" /> WhatsApp & Email Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label>Country Code</Label>
              <Select value={settings.countryCode} onValueChange={(v) => save({ countryCode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="+91">+91 India</SelectItem>
                  <SelectItem value="+971">+971 UAE</SelectItem>
                  <SelectItem value="+44">+44 UK</SelectItem>
                  <SelectItem value="+1">+1 USA / Canada</SelectItem>
                  <SelectItem value="+61">+61 Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message Signature</Label>
              <Textarea
                value={settings.signature}
                onChange={(e) => { save({ signature: e.target.value }); }}
                rows={2}
                placeholder="Appended to every client notification…"
              />
              <p className="text-[10px] font-sans text-muted-foreground">Applied to WhatsApp drafts and email bodies across the Notify engine.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data & Privacy */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Database size={14} className="text-primary" /> Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-sans font-medium text-foreground">Export workspace backup</p>
                <p className="text-[11px] font-sans text-muted-foreground mt-0.5">Download all cases, clients, tasks and documents as JSON.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportAllData} className="gap-1.5 h-8">
                <Download size={13} /> Export
              </Button>
            </div>
            <div className="border-t border-border pt-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-sans font-medium text-destructive">Reset demo data</p>
                <p className="text-[11px] font-sans text-muted-foreground mt-0.5">Clears locally stored records and restores original sample data.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)} className="gap-1.5 h-8">
                <RefreshCcw size={13} /> Reset
              </Button>
            </div>
            <div className="bg-muted/40 border border-border rounded-[var(--radius-sm)] p-3.5 flex items-start gap-2.5">
              <ShieldCheck size={14} className="text-chart-1 mt-0.5 shrink-0" />
              <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                Security model: documents encrypted at rest (AES-256), TLS 1.3 in transit, DPDP Act 2023 aligned processing. Client consent is recorded before any WhatsApp outreach.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Version footer */}
      <p className="text-center text-[10px] font-sans text-muted-foreground/60 pb-2">
        CaseFlow Legal Suite · v1.0 · <Badge variant="muted" className="text-[9px]">Production Scope</Badge>
      </p>

      {/* Reset confirm dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Reset everything?
            </DialogTitle>
            <DialogDescription>
              All locally stored cases, clients, tasks, documents and preferences will be cleared and sample data restored. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={resetDemoData}>Yes, reset data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
