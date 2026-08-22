import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Menu, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUI } from '@/store/uiStore';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function Topbar() {
  const { theme, toggleTheme } = useUI();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 z-20">
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

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search cases, clients, tasks…"
            className="pl-8 h-8 text-xs"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            id="topbar-search"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Court scope switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs hidden sm:flex">
                Bombay HC
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Court Scope</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>All Courts</DropdownMenuItem>
              <DropdownMenuItem>Bombay High Court</DropdownMenuItem>
              <DropdownMenuItem>District Court Pune</DropdownMenuItem>
              <DropdownMenuItem>NCLT Mumbai Bench</DropdownMenuItem>
              <DropdownMenuItem>Consumer Commission Nagpur</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification bell */}
          <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
            <Bell size={16} />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive"
            />
          </Button>

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
              <DropdownMenuItem>
                <User size={14} className="mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
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
