import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Save, Briefcase, CalendarClock, Users, CheckSquare,
  Scale, MapPin, Mail, Phone, BadgeCheck, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useTasks } from '@/store/taskStore';
import { useToast } from '@/store/toastStore';
import { getInitials, isToday } from '@/lib/utils';

const LS_PROFILE = 'lawcaseflow-profile';
const MY_ID = 'adv-1'; // logged-in advocate

const DEFAULT_PROFILE = {
  name: 'Adv. Nikhil Joshi',
  role: 'Partner',
  email: 'nikhil.joshi@lawfirm.in',
  phone: '9820001122',
  barCouncilNo: 'MH/1234/2010',
  firmName: 'Joshi & Associates',
  city: 'Pune, Maharashtra',
  chambers: 'Office 402, Trade Tower, FC Road, Pune – 411005',
  practiceAreas: 'Civil, Arbitration, Consumer, Property',
  about: 'Practising advocate with 15+ years of experience before the Bombay High Court and district courts across Maharashtra.',
};

type Profile = typeof DEFAULT_PROFILE;

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
}

export function ProfilePage() {
  const { cases } = useCases();
  const { clients } = useClients();
  const { tasks } = useTasks();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [dirty, setDirty] = useState(false);

  const update = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
    setDirty(true);
  };

  const handleSave = () => {
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    setDirty(false);
    toast('Profile saved.');
  };

  // Live stats for this advocate
  const stats = useMemo(() => {
    const myCases = cases.filter((c) => c.advocateIds.includes(MY_ID));
    const myCaseIds = new Set(myCases.map((c) => c.id));
    const todayHearings = myCases.filter((c) => isToday(c.nextDate)).length;
    const myClients = clients.filter((cl) => cl.caseIds.some((id) => myCaseIds.has(id))).length;
    const openTasks = tasks.filter((t) => t.assignedTo === profile.name && t.status !== 'Completed').length;
    return { total: myCases.length, todayHearings, myClients, openTasks };
  }, [cases, clients, tasks, profile.name]);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">My Profile</h1>
          <p className="text-sm font-sans text-muted-foreground">Your advocate identity across the workspace</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty} className="gap-1.5 h-8">
          <Save size={14} /> Save Changes
        </Button>
      </div>

      {/* Identity hero */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-16 bg-primary/10 border-b border-border" />
          <CardContent className="px-6 pb-6 -mt-8">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="h-20 w-20 rounded-[var(--radius)] bg-card border-4 border-card shadow-md bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold font-sans shrink-0 relative">
                {getInitials(profile.name.replace('Adv. ', ''))}
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-chart-1 border-2 border-card flex items-center justify-center" title="Verified advocate">
                  <BadgeCheck size={11} className="text-chart-1-foreground text-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-lg font-semibold text-foreground">{profile.name}</h2>
                  <Badge variant="accent">{profile.role}</Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-1 text-[11px] font-sans text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Scale size={11} /> BCI {profile.barCouncilNo}</span>
                  <span className="inline-flex items-center gap-1"><Mail size={11} /> {profile.email}</span>
                  <span className="inline-flex items-center gap-1"><Phone size={11} /> +91 {profile.phone}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={11} /> {profile.city}</span>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                { icon: Briefcase, label: 'My Cases', value: stats.total, color: 'var(--chart-2)' },
                { icon: CalendarClock, label: "Today's Hearings", value: stats.todayHearings, color: 'var(--chart-3)' },
                { icon: Users, label: 'My Clients', value: stats.myClients, color: 'var(--chart-4)' },
                { icon: CheckSquare, label: 'Open Tasks', value: stats.openTasks, color: 'var(--chart-1)' },
              ].map((s) => (
                <div key={s.label} className="bg-muted/40 border border-border rounded-[var(--radius-sm)] p-3">
                  <div className="h-7 w-7 rounded-[var(--radius-sm)] flex items-center justify-center mb-1.5" style={{ background: `${s.color}1f` }}>
                    <s.icon size={13} style={{ color: s.color }} />
                  </div>
                  <div className="font-mono text-lg font-semibold text-foreground leading-none">{s.value}</div>
                  <div className="text-[10px] font-sans text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details form */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-6">
          <CardTitle className="text-sm font-sans">Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Full Name</Label>
              <Input id="p-name" value={profile.name} onChange={update('name')} placeholder="Adv. Full Name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-role">Role</Label>
              <Select value={profile.role} onValueChange={(v) => { setProfile((p) => ({ ...p, role: v })); setDirty(true); }}>
                <SelectTrigger id="p-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Associate">Associate</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={profile.email} onChange={update('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone</Label>
              <Input id="p-phone" value={profile.phone} onChange={update('phone')} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-bar">Bar Council No.</Label>
              <Input id="p-bar" value={profile.barCouncilNo} onChange={update('barCouncilNo')} className="font-mono" placeholder="MH/1234/2010" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-firm">Firm / Chamber Name</Label>
              <Input id="p-firm" value={profile.firmName} onChange={update('firmName')} placeholder="Joshi & Associates" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-city">Base City</Label>
              <Input id="p-city" value={profile.city} onChange={update('city')} placeholder="Pune, Maharashtra" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-chambers">Chamber Address</Label>
              <Input id="p-chambers" value={profile.chambers} onChange={update('chambers')} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-areas">Practice Areas <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
              <Input id="p-areas" value={profile.practiceAreas} onChange={update('practiceAreas')} placeholder="Civil, Criminal, Tax…" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-about">About</Label>
              <Textarea id="p-about" value={profile.about} onChange={update('about')} rows={3} />
            </div>
          </div>
          <div className="bg-accent/40 border border-border rounded-[var(--radius-sm)] p-3.5 flex items-start gap-2.5">
            <Landmark size={14} className="text-accent-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
              Your Bar Council number is used on generated notices, cause lists and exports. Profile data stays on this device under the platform's DPDP-aligned privacy model.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
