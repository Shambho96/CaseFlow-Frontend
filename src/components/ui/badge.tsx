import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-sans transition-colors border',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        accent: 'bg-accent text-accent-foreground border-transparent',
        destructive: 'bg-destructive/15 text-destructive border-destructive/20',
        outline: 'border-border text-foreground bg-transparent',
        muted: 'bg-muted text-muted-foreground border-transparent',
        // Status badges
        decided: 'bg-chart-1/15 text-chart-1 border-chart-1/20',
        awaited: 'bg-accent text-accent-foreground border-transparent',
        pending: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
        abandoned: 'bg-destructive/10 text-destructive border-destructive/20',
        // Priority badges
        high: 'bg-chart-3/15 text-chart-3 border-chart-3/20',
        medium: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
        low: 'bg-muted text-muted-foreground border-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
