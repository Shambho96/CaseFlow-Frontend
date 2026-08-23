import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Menu, ChevronDown, LogOut, Settings, User, Briefcase, Users, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/store/uiStore';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useTasks } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { formatDate, cn } from '@/lib/utils';

export function Topbar() {
  const { theme, toggleTheme } = useUI();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  const { cases } = useCases();
  const { clients } = useClients();
  const { tasks } = useTasks();

  // Global search results
  const results = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return null;
    return {
      cases: cases
        .filter((c) =>
          c.caseNo.toLowerCase().includes(q) ||
          c.firstParty.toLowerCase().includes(q) ||
          c.oppositeParty.toLowerCase().includes(q) ||
          c.courtName.toLowerCase().includes(q))
        .slice(0, 4),
      clients: clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
      tasks: tasks.filter((t) => t.description.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [searchQ, cases, clients, tasks]);

  const resultCount = results ? results.cases.length + results.clients.length + results.tasks.length : 0;

  // Notification feed: today's hearings + due/overdue tasks
  const notifications = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const hearings = cases.filter((c) => c.nextDate === todayStr || c.nextDate === tomorrowStr);
    const dueTasks = tasks.filter((t) => t.status !== 'Completed' && t.dueDate <= todayStr);
    return { hearings, dueTasks };
  }, [cases, tasks]);
  const notifCount = notifications.hearings.length + notifications.dueTasks.length;

  const go = (path: string) => { setSearchQ(''); setSearchFocus(false); navigate(path); };

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 z-20 no-print">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </Button>

        {/* Global search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search cases, clients, tasks…"
            className="pl-8 h-8 text-xs"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => window.setTimeout(() => setSearchFocus(false), 150)}
            id="topbar-search"
          />
          <AnimatePresence>
            {searchFocus && results && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1.5 w-[26rem] max-w-[80vw] bg-popover border border-border rounded-[var(--radius-sm)] shadow-md overflow-hidden z-50"
              >
                {resultCount === 0 ? (
                  <p className="px-4 py-6 text-center text-xs font-sans text-muted-foreground">No matches for “{searchQ}”.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto py-1">
                    {results.cases.map((c) => (
                      <button key={c.id} onMouseDown={() => go(`/dashboard/cases/${c.id}`)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors">
                        <Briefcase size={13} className="text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-primary">{c.caseNo}</span>
                        <span className="text-xs font-sans text-muted-foreground truncate">{c.firstParty} v. {c.oppositeParty}</span>
                      </button>
                    ))}
                    {results.clients.map((cl) => (
                      <button key={cl.id} onMouseDown={() => go('/dashboard/clients')} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors">
                        <Users size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs font-sans text-foreground">{cl.name}</span>
                        <span className="text-xs font-mono text-muted-foreground ml-auto">{cl.phone}</span>
                      </button>
                    ))}
                    {results.tasks.map((t) => (
                      <button key={t.id} onMouseDown={() => go('/dashboard/tasks')} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors">
                        <CheckSquare size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs font-sans text-foreground truncate flex-1">{t.description}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">Due {formatDate(t.dueDate)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
                <Bell size={16} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold font-mono flex items-center justify-center px-0.5">
                    {notifCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-sans font-semibold text-foreground">Notifications</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifCount === 0 ? (
                  <p className="px-4 py-8 text-center text-xs font-sans text-muted-foreground">You're all caught up.</p>
                ) : (
                  <div className="py-1">
                    {notifications.hearings.map((c) => (
                      <button key={c.id} onClick={() => navigate(`/dashboard/cases/${c.id}`)} className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors">
                        <Briefcase size={13} className="text-accent-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-primary">{c.caseNo}</p>
                          <p className="text-[11px] font-sans text-muted-foreground">
                            Hearing {c.nextDate === new Date().toISOString().split('T')[0] ? 'today' : 'tomorrow'} · Ct. {c.courtNo} · {c.fixedFor}
                          </p>
                        </div>
                      </button>
                    ))}
                    {notifications.dueTasks.map((t) => (
                      <button key={t.id} onClick={() => navigate('/dashboard/tasks')} className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors">
                        <CheckSquare size={13} className={cn('mt-0.5 shrink-0', t.dueDate < new Date().toISOString().split('T')[0] ? 'text-destructive' : 'text-chart-3')} />
                        <div className="min-w-0">
                          <p className="text-xs font-sans text-foreground truncate">{t.description}</p>
                          <p className="text-[11px] font-sans text-muted-foreground">
                            {t.dueDate < new Date().toISOString().split('T')[0] ? 'Overdue' : 'Due'} {formatDate(t.dueDate)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          {/* Avatar/profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">NJ</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium font-sans hidden sm:inline">Adv. Nikhil Joshi</span>
                <ChevronDown size={12} className="text-muted-foreground hidden sm:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                <User size={14} className="mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                <Settings size={14} className="mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => navigate('/login')}
              >
                <LogOut size={14} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px]">
          <Sidebar mobile onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
