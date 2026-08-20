'use client';

import type { Prestamo } from '@/types';
import { formatMoneda } from '@/lib/format';

type TablaPrestamosActivosProps = {
  prestamos: Prestamo[];
  tasa: number;
  prestamoSeleccionadoId: string | null;
  onSelect: (prestamoId: string) => void;
};

export function TablaPrestamosActivos({
  prestamos,
  tasa,
  prestamoSeleccionadoId,
  onSelect,
}: TablaPrestamosActivosProps) {
  if (prestamos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este socio no tiene préstamos activos.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Monto Original
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Saldo Pendiente
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Interés Periodo
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {prestamos.map((p) => {
            const interes = Math.round(p.saldo_pendiente * tasa);
            const seleccionado = p.id === prestamoSeleccionadoId;
            return (
              <tr
                key={p.id}
                className={`border-b border-border transition-colors last:border-0 ${
                  seleccionado ? 'bg-primary/5' : 'hover:bg-muted/20'
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-foreground">
                  {formatMoneda(p.monto_solicitado)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium text-foreground">
                  {formatMoneda(p.saldo_pendiente)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-muted-foreground">
                  {formatMoneda(interes)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      seleccionado
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {seleccionado ? 'Seleccionado' : 'Abonar'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
