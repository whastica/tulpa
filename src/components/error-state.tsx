import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  icon,
  title = 'Algo salió mal',
  description = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
  action,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 text-destructive">
        {icon ?? <AlertTriangle className="size-10" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Intentar de nuevo
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
