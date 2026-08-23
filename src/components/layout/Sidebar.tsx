import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  FolderOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUI } from '@/store/uiStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/clients', label: 'Clients', icon: Users },
  { to: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { to: '/dashboard/cases', label: 'Cases', icon: Briefcase },
  { to: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
  { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useUI();
  const location = useLocation();
  const collapsed = !mobile && !sidebarOpen;

  return (
    <motion.aside
      animate={{ width: mobile ? 260 : sidebarOpen ? 220 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden no-print',
        mobile && 'w-full'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border shrink-0', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] shrink-0">
          <img src="/favicon.svg" alt="lawCaseflow logo" className="h-6 w-6" />
        </div>
        <AnimatePresence>
          {(!collapsed || mobile) && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="font-serif text-lg font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden"
            >
              CaseFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium font-sans transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  <AnimatePresence>
                    {(!collapsed || mobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle (desktop only) */}
      {!mobile && (
        <div className="px-2 pb-4">
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-3 w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-sidebar-foreground/50',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span className="font-sans text-xs">Collapse</span>}
          </button>
        </div>
      )}
    </motion.aside>
  );
}
