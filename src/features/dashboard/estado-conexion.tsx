'use client';

import type { RealtimeEstado } from './realtime';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const config: Record<
  RealtimeEstado,
  { label: string; dot: string; icon: typeof Wifi | null; pulse?: boolean }
> = {
  conectando: {
    label: 'Conectando…',
    dot: 'bg-warning',
    icon: RefreshCw,
    pulse: true,
  },
  conectado: {
    label: 'Tiempo real activo',
    dot: 'bg-success',
    icon: Wifi,
  },
  reconectando: {
    label: 'Reconectando…',
    dot: 'bg-warning',
    icon: RefreshCw,
    pulse: true,
  },
  desconectado: {
    label: 'Sin conexión · mostrando datos guardados',
    dot: 'bg-destructive',
    icon: WifiOff,
  },
};

export function EstadoConexion({ estado }: { estado: RealtimeEstado }) {
  const c = config[estado];
  const Icon = c.icon;
  return (
    <div
      role="status"
      className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        {c.pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              c.dot
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', c.dot)} />
      </span>
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {c.label}
    </div>
  );
}