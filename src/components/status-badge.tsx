import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusBadgeProps = {
  status: StatusType;
  label: string;
  showIcon?: boolean;
  className?: string;
};

const statusConfig: Record<StatusType, { icon: typeof CheckCircle | null; className: string }> = {
  success: {
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  danger: {
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  info: {
    icon: Info,
    className: 'bg-info/10 text-info border-info/20',
  },
  neutral: {
    icon: null,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function StatusBadge({ status, label, showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', config.className, className)}
    >
      {showIcon && Icon && <Icon className="size-3" />}
      {label}
    </Badge>
  );
}
