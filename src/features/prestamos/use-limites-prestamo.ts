'use client';

import { useMemo } from 'react';
import { useMockStore } from '@/mocks';
import {
  calcularCapitalAportadoSocio,
  calcularFondoTotal,
  calcularLiquidez,
  calcularPrestamosActivos,
} from '@/features/dashboard/metrics';

export type LimitesPrestamo = {
  fondoTotal: number;
  liquidez: number;
  montoMaximo: number;
  montoMaximoIndividual: number;
  prestamosActivosCount: number;
  tasa: number;
};

export function useLimitesPrestamo(
  grupoId: string,
  socioId?: string | null
): LimitesPrestamo {
  const grupo = useMockStore((s) => s.grupo);
  const movimientos = useMockStore((s) => s.movimientos);
  const prestamos = useMockStore((s) => s.prestamos);

  return useMemo(() => {
    if (!grupo || grupo.id !== grupoId) {
      return {
        fondoTotal: 0,
        liquidez: 0,
        montoMaximo: 0,
        montoMaximoIndividual: 0,
        prestamosActivosCount: 0,
        tasa: 0,
      };
    }

    const movimientosGrupo = movimientos.filter((m) => m.grupo_id === grupoId);
    const fondoTotal = calcularFondoTotal(movimientosGrupo, grupoId);
    const { cantidad, total: prestamosActivosTotal } = calcularPrestamosActivos(prestamos, grupoId);
    const liquidez = calcularLiquidez(fondoTotal, prestamosActivosTotal);
    const montoMaximoRegla50 = Math.round(fondoTotal * 0.5);

    // Regla del tope del doble: máximo 2x el ahorro (aportes) del socio.
    const montoMaximoIndividual = socioId
      ? calcularCapitalAportadoSocio(movimientosGrupo, socioId) * 2
      : montoMaximoRegla50;

    const montoMaximo = Math.min(montoMaximoIndividual, montoMaximoRegla50, liquidez);

    return {
      fondoTotal,
      liquidez,
      montoMaximo,
      montoMaximoIndividual,
      prestamosActivosCount: cantidad,
      tasa: grupo.tasa_interes_prestamo,
    };
  }, [grupo, movimientos, prestamos, grupoId, socioId]);
}
