'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Grupo } from '@/types';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { calcularMetricasGrupo, type MetricasDashboard } from './metrics';
import { crearServicioRealtime, type RealtimeEstado } from './realtime';

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

export type DashboardEstado =
  | 'cargando'
  | 'no_encontrado'
  | 'no_autorizado'
  | 'listo';

export type DashboardFinanciero = {
  estado: DashboardEstado;
  metricas: MetricasDashboard | null;
  realtimeEstado: RealtimeEstado;
  esPrincipal: boolean;
  grupo: Grupo | null;
  nombreGrupo: string | null;
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useDashboardFinanciero(grupoId: string): DashboardFinanciero {
  const { hydrated, isPrincipal, socio } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const socios = useMockStore((s) => s.socios);
  const movimientos = useMockStore((s) => s.movimientos);
  const prestamos = useMockStore((s) => s.prestamos);

  const [realtimeEstado, setRealtimeEstado] = useState<RealtimeEstado>('conectando');
  const [ultimoCambio, setUltimoCambio] = useState(0);

  const grupoCoincide = grupo?.id === grupoId;

  // Suscripción Realtime al grupo (mock por ahora; swap a Supabase sin tocar la UI)
  useEffect(() => {
    if (!grupoCoincide) return;
    const servicio = crearServicioRealtime();
    const suscripcion = servicio.suscribir(grupoId, {
      onCambio: () => setUltimoCambio((c) => c + 1),
      onEstado: setRealtimeEstado,
    });
    return suscripcion.cancelar;
  }, [grupoId, grupoCoincide]);

  const metricas = useMemo(() => {
    if (!grupo || !grupoCoincide) return null;
    return calcularMetricasGrupo({ grupo, socios, movimientos, prestamos });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara recalculo ante cambios Realtime
  }, [grupo, grupoCoincide, socios, movimientos, prestamos, ultimoCambio]);

  let estado: DashboardEstado = 'cargando';
  if (hydrated) {
    if (!grupo || !grupoCoincide) {
      estado = 'no_encontrado';
    } else if (isPrincipal) {
      estado = 'listo';
    } else if (socio?.grupo_id === grupoId) {
      estado = 'listo';
    } else {
      estado = 'no_autorizado';
    }
  }

  return {
    estado,
    metricas,
    realtimeEstado,
    esPrincipal: isPrincipal,
    grupo: grupo && grupoCoincide ? grupo : null,
    nombreGrupo: grupo && grupoCoincide ? grupo.nombre : null,
  };
}