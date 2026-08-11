'use client';

import type { Socio } from '@/types';
import { StatusBadge } from '@/components/status-badge';
import { formatMoneda } from '@/lib/format';
import { Users, Lock } from 'lucide-react';

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function SociosInfo({ socios }: { socios: Socio[] }) {
  const sociosActivos = socios.filter((s) => s.estado === 'activo');
  const cuotaTotal = sociosActivos.reduce((sum, s) => sum + s.cuota_mensual_fija, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Socios del grupo
            </h2>
            <p className="text-sm text-muted-foreground">
              {socios.length} integrantes · Membresía cerrada
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" />
          <span>Cerrado</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nombre
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cuota mensual
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {socios.map((socio, index) => (
              <tr key={socio.id} className="border-t border-border transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">{socio.nombre}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-foreground">
                  {formatMoneda(socio.cuota_mensual_fija)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge
                    status={socio.estado === 'activo' ? 'success' : 'warning'}
                    label={socio.estado === 'activo' ? 'Activo' : 'Retirado'}
                    showIcon={false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/40">
              <td
                colSpan={2}
                className="px-4 py-3 font-semibold text-foreground"
              >
                Cuota total (socios activos)
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-foreground">
                {formatMoneda(cuotaTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {socios.map((socio, index) => (
          <div
            key={socio.id}
            className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{socio.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm tabular-nums font-medium text-foreground">
                {formatMoneda(socio.cuota_mensual_fija)}
              </span>
              <StatusBadge
                status={socio.estado === 'activo' ? 'success' : 'warning'}
                label={socio.estado === 'activo' ? 'Act' : 'Ret'}
                showIcon={false}
                className="px-1.5 py-0 text-[10px]"
              />
            </div>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/40 p-3">
          <span className="text-sm font-semibold text-foreground">Total mensual</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatMoneda(cuotaTotal)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/10 p-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-xs text-info-foreground">
          La lista de socios y las cuotas mensuales quedaron fijas al iniciar el
          grupo y no pueden modificarse durante el ciclo.
        </p>
      </div>
    </div>
  );
}
