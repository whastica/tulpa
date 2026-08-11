'use client';

import type { Grupo } from '@/types';
import { StatusBadge } from '@/components/status-badge';
import { formatFecha, formatPorcentaje } from '@/lib/format';
import { Calendar, Percent, Shield } from 'lucide-react';

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function GrupoInfo({ grupo }: { grupo: Grupo }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">{grupo.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configuración del grupo — valores inmutables durante el ciclo.
          </p>
        </div>
        <StatusBadge
          status={grupo.estado === 'activo' ? 'success' : 'neutral'}
          label={grupo.estado === 'activo' ? 'Activo' : grupo.estado}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Calendar className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              Fecha de inicio
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatFecha(grupo.fecha_inicio)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Calendar className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              Fecha de cierre
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatFecha(grupo.fecha_cierre_pactada)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Percent className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tasa de interés mensual
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatPorcentaje(grupo.tasa_interes_prestamo)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Percent className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              Porcentaje de mora
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatPorcentaje(grupo.porcentaje_mora)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Shield className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              ID del grupo
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {grupo.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
