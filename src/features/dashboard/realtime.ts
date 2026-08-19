import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Tipos del servicio de tiempo real
// ──────────────────────────────────────────────

export type RealtimeEstado =
  | 'conectando'
  | 'conectado'
  | 'reconectando'
  | 'desconectado';

export type CambioRealtime = {
  tabla: 'movimientos_ledger' | 'prestamos';
  evento: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: unknown;
};

export type SuscripcionRealtime = {
  cancelar: () => void;
};

export type HandlersRealtime = {
  onCambio: (cambio: CambioRealtime) => void;
  onEstado: (estado: RealtimeEstado) => void;
};

export type ServicioRealtime = {
  suscribir: (grupoId: string, handlers: HandlersRealtime) => SuscripcionRealtime;
};

// ──────────────────────────────────────────────
// Implementación Mock sobre el store Zustand.
// Cuando exista Supabase, se reemplaza por un adapter
// que use `@supabase/supabase-js` con el mismo contrato.
// ──────────────────────────────────────────────

class MockServicioRealtime implements ServicioRealtime {
  suscribir(grupoId: string, { onCambio, onEstado }: HandlersRealtime): SuscripcionRealtime {
    onEstado('conectado');

    const unsubscribe = useMockStore.subscribe((state, prevState) => {
      if (state.movimientos !== prevState.movimientos) {
        onCambio({
          tabla: 'movimientos_ledger',
          evento: 'INSERT',
          payload: state.movimientos.filter((m) => m.grupo_id === grupoId),
        });
      }
      if (state.prestamos !== prevState.prestamos) {
        onCambio({
          tabla: 'prestamos',
          evento: 'UPDATE',
          payload: state.prestamos.filter((p) => p.grupo_id === grupoId),
        });
      }
    });

    return { cancelar: unsubscribe };
  }
}

let servicio: ServicioRealtime | null = null;

export function crearServicioRealtime(): ServicioRealtime {
  if (!servicio) {
    servicio = new MockServicioRealtime();
  }
  return servicio;
}