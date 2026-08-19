'use client';

import type { FilaSocioResumen } from './metrics';
import { StatusBadge } from '@/components/status-badge';
import { formatMoneda } from '@/lib/format';
import { Users, Eye, UsersRound } from 'lucide-react';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function badgeParaEstado(estado: FilaSocioResumen['estado']) {
  switch (estado) {
    case 'al_dia':
      return { status: 'success' as const, label: 'Al día' };
    case 'en_mora':
      return { status: 'danger' as const, label: 'En mora' };
    case 'retirado_anticipado':
      return { status: 'neutral' as const, label: 'Retirado anticipado' };
  }
}

function BarrasProgreso({ valor }: { valor: number }) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{porcentaje}%</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function TablaSocios({ filas }: { filas: FilaSocioResumen[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Estado de los socios
            </h2>
            <p className="text-sm text-muted-foreground">
              {filas.length} integrantes · Consulta de solo lectura
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="size-3" aria-hidden="true" />
          <span>Solo lectura</span>
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
                Socio
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Aporte acumulado
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cuotas pagadas
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estado de pago
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, index) => {
              const badge = badgeParaEstado(fila.estado);
              return (
                <tr
                  key={fila.socio.id}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {fila.socio.nombre}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {formatMoneda(fila.aporteAcumulado)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono tabular-nums text-foreground">
                        {fila.cuotasPagadas}/{fila.cuotasEsperadas}
                      </span>
                      <BarrasProgreso valor={fila.progreso} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={badge.status} label={badge.label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {filas.map((fila, index) => {
          const badge = badgeParaEstado(fila.estado);
          return (
            <div
              key={fila.socio.id}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {fila.socio.nombre}
                  </span>
                </div>
                <StatusBadge
                  status={badge.status}
                  label={badge.label}
                  showIcon={false}
                  className="px-1.5 py-0 text-[10px]"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Aporte: <strong className="text-foreground">{formatMoneda(fila.aporteAcumulado)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Cuotas: <strong className="text-foreground">{fila.cuotasPagadas}/{fila.cuotasEsperadas}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/10 p-3">
        <UsersRound className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-xs text-info-foreground">
          Cuotas pagadas = aportes acumulados / cuota mensual fija, comparados contra
          los meses transcurridos desde la fecha de inicio del grupo.
        </p>
      </div>
    </div>
  );
}