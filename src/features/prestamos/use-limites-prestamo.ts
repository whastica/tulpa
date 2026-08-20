'use client';

import { useMemo } from 'react';
import { useMockStore } from '@/mocks';
import { calcularFondoTotal, calcularLiquidez, calcularPrestamosActivos } from '@/features/dashboard/metrics';

export type LimitesPrestamo = {
  fondoTotal: number;
  liquidez: number;
  montoMaximo: number;
  prestamosActivosCount: number;
  tasa: number;
};

export function useLimitesPrestamo(grupoId: string): LimitesPrestamo {
  const grupo = useMockStore((s) => s.grupo);
  const movimientos = useMockStore((s) => s.movimientos);
  const prestamos = useMockStore((s) => s.prestamos);

  return useMemo(() => {
    if (!grupo || grupo.id !== grupoId) {
      return { fondoTotal: 0, liquidez: 0, montoMaximo: 0, prestamosActivosCount: 0, tasa: 0 };
    }

    const movimientosGrupo = movimientos.filter((m) => m.grupo_id === grupoId);
    const fondoTotal = calcularFondoTotal(movimientosGrupo, grupoId);
    const { cantidad, total: prestamosActivosTotal } = calcularPrestamosActivos(prestamos, grupoId);
    const liquidez = calcularLiquidez(fondoTotal, prestamosActivosTotal);
    const montoMaximo = Math.round(fondoTotal * 0.5);

    return {
      fondoTotal,
      liquidez,
      montoMaximo,
      prestamosActivosCount: cantidad,
      tasa: grupo.tasa_interes_prestamo,
    };
  }, [grupo, movimientos, prestamos, grupoId]);
}
