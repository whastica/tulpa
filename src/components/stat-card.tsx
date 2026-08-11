import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatAccent = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: StatAccent;
  description?: string;
  className?: string;
};

const accentClass: Record<StatAccent, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatCard({
  label,
  value,
  icon,
  accent = 'neutral',
  description,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </span>
          {description && (
            <span className="truncate text-xs text-muted-foreground">{description}</span>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              accentClass[accent]
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}