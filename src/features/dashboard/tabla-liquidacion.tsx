'use client';

import { useMemo } from 'react';
import type { Grupo, MovimientoLedger, Socio } from '@/types';
import { calcularLiquidacion } from './metrics';
import { formatMoneda, formatPorcentaje } from '@/lib/format';
import { HandCoins, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Componente (HU 8.2: reparto proporcional de rendimientos)
// ──────────────────────────────────────────────

export function TablaResumenLiquidacion({
  grupo,
  socios,
  movimientos,
}: {
  grupo: Grupo;
  socios: Socio[];
  movimientos: MovimientoLedger[];
}) {
  const resumen = useMemo(
    () => calcularLiquidacion({ grupo, socios, movimientos }),
    [grupo, socios, movimientos]
  );

  const totalEntregar = resumen.filas.reduce((sum, f) => sum + f.totalAEntregar, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <HandCoins className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Liquidación final
            </h2>
            <p className="text-sm text-muted-foreground">
              {resumen.filas.length} socios activos participan del reparto
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-xs text-muted-foreground">Rendimientos a repartir</span>
          <span className="font-mono font-medium text-foreground">
            {formatMoneda(resumen.rendimientosTotales)}
          </span>
        </div>
      </div>

      {resumen.filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay socios activos para liquidar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Socio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cuota fija mensual
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Capital ahorrado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  % Participación
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Parte de rendimientos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total a entregar
                </th>
              </tr>
            </thead>
            <tbody>
              {resumen.filas.map((fila) => (
                <tr
                  key={fila.socio.id}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {fila.socio.nombre}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {formatMoneda(fila.socio.cuota_mensual_fija)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {formatMoneda(fila.capitalAhorrado)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {formatPorcentaje(fila.proporcion)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {formatMoneda(fila.parteRendimiento)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                    {formatMoneda(fila.totalAEntregar)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={2} className="px-4 py-3 font-semibold text-foreground">
                  Total del grupo
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                  {formatMoneda(resumen.totalCapitalActivos)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                  100.0%
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                  {formatMoneda(resumen.rendimientosTotales)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                  {formatMoneda(totalEntregar)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/10 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-xs text-info-foreground">
          El capital ahorrado = cuotas de ahorro + moras pagadas. Los rendimientos
          (intereses + moras) se reparten proporcionalmente a ese capital entre los
          socios activos. Los socios retirados anticipadamente no participan del reparto.
        </p>
      </div>
    </div>
  );
}