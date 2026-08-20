'use client';

import { useMemo, useState } from 'react';
import { useMockStore } from '@/mocks';
import { formatMoneda } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModalCorreccion } from './modal-correccion';
import { RotateCcw } from 'lucide-react';

const TIPO_LABELS: Record<string, string> = {
  aporte: 'Aporte',
  mora: 'Mora',
  prestamo: 'Préstamo',
  pago_prestamo: 'Pago',
  interes: 'Interés',
  retiro_anticipado: 'Retiro',
  cierre_liquidacion: 'Cierre',
  renovacion: 'Renovación',
  correccion: 'Corrección',
  cambio_cuota: 'Cambio de cuota',
};

const TIPO_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  aporte: 'default',
  mora: 'secondary',
  prestamo: 'destructive',
  pago_prestamo: 'outline',
  interes: 'outline',
  retiro_anticipado: 'secondary',
  cierre_liquidacion: 'outline',
  renovacion: 'outline',
  correccion: 'secondary',
  cambio_cuota: 'outline',
};

export function SeccionMovimientos({
  grupoId,
  esAdministrador,
}: {
  grupoId: string;
  esAdministrador: boolean;
}) {
  const movimientos = useMockStore((s) => s.movimientos);
  const socios = useMockStore((s) => s.socios);
  const [movimientoAcorregir, setMovimientoAcorregir] = useState<string | null>(null);

  const movimientosGrupo = useMemo(
    () =>
      movimientos
        .filter((m) => m.grupo_id === grupoId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado_en.localeCompare(a.creado_en)),
    [movimientos, grupoId]
  );

  const totalFilas = movimientosGrupo.length;

  function nombreSocio(id: string | null) {
    if (!id) return '—';
    const socio = socios.find((s) => s.id === id);
    return socio?.nombre ?? id;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Ledger del grupo
        </h3>
        <span className="text-xs text-muted-foreground">{totalFilas} registros</span>
      </div>

      {movimientosGrupo.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay movimientos registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Socio</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nota</th>
                {esAdministrador && (
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acción</th>
                )}
              </tr>
            </thead>
            <tbody>
              {movimientosGrupo.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                    {m.fecha}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TIPO_VARIANTS[m.tipo] ?? 'info'}>
                      {TIPO_LABELS[m.tipo] ?? m.tipo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground">{nombreSocio(m.socio_id)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-foreground">
                    {formatMoneda(m.monto)}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                    {m.nota || '—'}
                  </td>
                  {esAdministrador && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setMovimientoAcorregir(m.id)}
                      >
                        <RotateCcw className="size-3" aria-hidden="true" />
                        Corregir
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalCorreccion
        open={movimientoAcorregir !== null}
        onOpenChange={(a) => !a && setMovimientoAcorregir(null)}
        movimientoId={movimientoAcorregir}
      />
    </div>
  );
}