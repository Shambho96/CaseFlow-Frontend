import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const KIND_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const KIND_STYLE: Record<ToastKind, string> = {
  success: 'text-chart-1',
  error: 'text-destructive',
  info: 'text-accent-foreground',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] no-print">
        {items.map((t) => {
          const Icon = KIND_ICON[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-2.5 bg-card border border-border rounded-[var(--radius-sm)] shadow-md px-3.5 py-3',
                'animate-in fade-in slide-in-from-bottom-2'
              )}
              role="status"
            >
              <Icon size={15} className={cn('shrink-0 mt-0.5', KIND_STYLE[t.kind])} />
              <p className="text-xs font-sans text-foreground leading-relaxed flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
