import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Grupo,
  Socio,
  MovimientoLedger,
  Prestamo,
  SolicitudPrestamo,
  Notificacion,
  NotificacionRol,
} from '@/types';

// ──────────────────────────────────────────────
// Store types
// ──────────────────────────────────────────────

type MockStore = {
  // ── State ──
  grupos: Grupo[];
  grupo: Grupo | null;
  socios: Socio[];
  movimientos: MovimientoLedger[];
  prestamos: Prestamo[];
  solicitudesPrestamo: SolicitudPrestamo[];
  notificaciones: Notificacion[];
  /** Contadores por prefijo para generar ids únicos (persistidos). */
  contadores: Record<string, number>;

  // ── Read: Grupo ──
  getGrupos: () => Grupo[];
  getGrupo: () => Grupo | null;
  getGrupoPorId: (id: string) => Grupo | undefined;
  getGrupoPorCodigo: (codigo: string) => Grupo | undefined;
  crearGrupo: (datos: Omit<Grupo, 'id' | 'codigo' | 'estado'>) => Grupo;
  actualizarGrupo: (datos: Partial<Grupo>) => void;
  seleccionarGrupo: (id: string) => void;
  seleccionarGrupoPorCodigo: (codigo: string) => void;
  iniciarNuevoGrupo: () => void;

  // ── Read: Socios ──
  getSocios: () => Socio[];
  getSocioPorId: (id: string) => Socio | undefined;
  getSociosPorGrupo: (grupoId: string) => Socio[];
  getSociosActivos: () => Socio[];
  registrarSocios: (socios: Omit<Socio, 'id'>[]) => void;
  actualizarSocio: (id: string, datos: Partial<Socio>) => void;

  // ── Read: Movimientos ──
  getMovimientos: () => MovimientoLedger[];
  getMovimientosPorSocio: (socioId: string) => MovimientoLedger[];
  getMovimientosPorGrupo: (grupoId: string) => MovimientoLedger[];
  getMovimientosPorTipo: (tipo: MovimientoLedger['tipo']) => MovimientoLedger[];
  registrarMovimiento: (movimiento: Omit<MovimientoLedger, 'id' | 'creado_en'>) => void;

  // ── Read: Préstamos ──
  getPrestamos: () => Prestamo[];
  getPrestamosActivos: () => Prestamo[];
  getPrestamosPorSocio: (socioId: string) => Prestamo[];
  getPrestamoPorId: (id: string) => Prestamo | undefined;
  registrarPrestamo: (prestamo: Omit<Prestamo, 'id'>) => void;
  actualizarPrestamo: (id: string, datos: Partial<Prestamo>) => void;

  // ── Solicitudes de préstamo ──
  getSolicitudesPrestamo: () => SolicitudPrestamo[];
  getSolicitudesPorGrupo: (grupoId: string) => SolicitudPrestamo[];
  getSolicitudesPorSocio: (socioId: string) => SolicitudPrestamo[];
  crearSolicitudPrestamo: (solicitud: Omit<SolicitudPrestamo, 'id'>) => SolicitudPrestamo;
  actualizarSolicitudPrestamo: (id: string, datos: Partial<SolicitudPrestamo>) => void;

  // ── Notificaciones ──
  getNotificaciones: () => Notificacion[];
  getNotificacionesParaRol: (rol: NotificacionRol) => Notificacion[];
  crearNotificacion: (notificacion: Omit<Notificacion, 'id' | 'creado_en'>) => void;
  marcarNotificacionesLeidas: (ids: string[]) => void;
  marcarTodasLeidasParaRol: (rol: NotificacionRol) => void;
};

// ──────────────────────────────────────────────
// Código de invitación (ticket de acceso al grupo)
// ──────────────────────────────────────────────

const CARACTERES_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarCodigoUnico(existentes: string[]): string {
  let codigo = '';
  do {
    codigo = Array.from(
      { length: 6 },
      () => CARACTERES_CODIGO[Math.floor(Math.random() * CARACTERES_CODIGO.length)]
    ).join('');
  } while (existentes.includes(codigo));
  return codigo;
}

// ──────────────────────────────────────────────
// Store implementation (persistido en localStorage:
// al no haber backend, los grupos creados sobreviven al refresco)
// ──────────────────────────────────────────────

export const useMockStore = create<MockStore>()(
  persist(
    (set, get) => ({
      // ── State (arranca vacío: los grupos se crean desde la landing) ──
      grupos: [],
      grupo: null,
      socios: [],
      movimientos: [],
      prestamos: [],
      solicitudesPrestamo: [],
      notificaciones: [],
      contadores: {},

      // ── Grupo ──
      getGrupos: () => get().grupos,

      getGrupo: () => get().grupo,

      getGrupoPorId: (id) => get().grupos.find((g) => g.id === id),

      getGrupoPorCodigo: (codigo) =>
        get().grupos.find((g) => g.codigo === codigo),

      crearGrupo: (datos) => {
        const n = (get().contadores['grupo'] ?? 0) + 1;
        const id = `grupo-${String(n).padStart(3, '0')}`;
        const nuevo: Grupo = {
          ...datos,
          id,
          codigo: generarCodigoUnico(get().grupos.map((g) => g.codigo)),
          estado: 'activo',
        };
        set((state) => ({
          contadores: { ...state.contadores, grupo: n },
          grupos: [...state.grupos, nuevo],
          grupo: nuevo,
        }));
        return nuevo;
      },

      actualizarGrupo: (datos) =>
        set((state) => ({
          grupo: state.grupo ? { ...state.grupo, ...datos } : null,
          grupos: state.grupos.map((g) =>
            g.id === state.grupo?.id ? { ...g, ...datos } : g
          ),
        })),

      seleccionarGrupo: (id) =>
        set((state) => ({
          grupo: state.grupos.find((g) => g.id === id) ?? state.grupo,
        })),

      seleccionarGrupoPorCodigo: (codigo) =>
        set((state) => ({
          grupo: state.grupos.find((g) => g.codigo === codigo) ?? state.grupo,
        })),

      iniciarNuevoGrupo: () => set({ grupo: null }),

      // ── Socios ──
      getSocios: () => get().socios,

      getSocioPorId: (id) => get().socios.find((s) => s.id === id),

      getSociosPorGrupo: (grupoId) =>
        get().socios.filter((s) => s.grupo_id === grupoId),

      getSociosActivos: () =>
        get().socios.filter((s) => s.estado === 'activo'),

      registrarSocios: (socios) => {
        const base = get().contadores['socio'] ?? 0;
        const nuevosSocios: Socio[] = socios.map((s, i) => ({
          ...s,
          id: `socio-${String(base + i + 1).padStart(3, '0')}`,
        }));
        set((state) => ({
          contadores: { ...state.contadores, socio: base + socios.length },
          socios: [...state.socios, ...nuevosSocios],
        }));
      },

      actualizarSocio: (id, datos) =>
        set((state) => ({
          socios: state.socios.map((s) => (s.id === id ? { ...s, ...datos } : s)),
        })),

      // ── Movimientos ──
      getMovimientos: () => get().movimientos,

      getMovimientosPorSocio: (socioId) =>
        get().movimientos.filter((m) => m.socio_id === socioId),

      getMovimientosPorGrupo: (grupoId) =>
        get().movimientos.filter((m) => m.grupo_id === grupoId),

      getMovimientosPorTipo: (tipo) =>
        get().movimientos.filter((m) => m.tipo === tipo),

      registrarMovimiento: (movimiento) => {
        const n = (get().contadores['mov'] ?? 0) + 1;
        const id = `mov-${String(n).padStart(3, '0')}`;
        const ahora = new Date().toISOString();
        const nuevo: MovimientoLedger = {
          ...movimiento,
          id,
          creado_en: ahora,
        };
        set((state) => ({
          contadores: { ...state.contadores, mov: n },
          movimientos: [...state.movimientos, nuevo],
        }));
      },

      // ── Préstamos ──
      getPrestamos: () => get().prestamos,

      getPrestamosActivos: () =>
        get().prestamos.filter((p) => p.estado === 'activo'),

      getPrestamosPorSocio: (socioId) =>
        get().prestamos.filter((p) => p.socio_id === socioId),

      getPrestamoPorId: (id) => get().prestamos.find((p) => p.id === id),

      registrarPrestamo: (prestamo) => {
        const n = (get().contadores['prest'] ?? 0) + 1;
        const id = `prest-${String(n).padStart(3, '0')}`;
        const nuevo: Prestamo = { ...prestamo, id };
        set((state) => ({
          contadores: { ...state.contadores, prest: n },
          prestamos: [...state.prestamos, nuevo],
        }));
      },

      actualizarPrestamo: (id, datos) =>
        set((state) => ({
          prestamos: state.prestamos.map((p) =>
            p.id === id ? { ...p, ...datos } : p
          ),
        })),

      // ── Solicitudes de préstamo ──
      getSolicitudesPrestamo: () => get().solicitudesPrestamo,

      getSolicitudesPorGrupo: (grupoId) =>
        get().solicitudesPrestamo.filter((s) => s.grupo_id === grupoId),

      getSolicitudesPorSocio: (socioId) =>
        get().solicitudesPrestamo.filter((s) => s.socio_id === socioId),

      crearSolicitudPrestamo: (solicitud) => {
        const n = (get().contadores['sol'] ?? 0) + 1;
        const id = `sol-${String(n).padStart(3, '0')}`;
        const nueva: SolicitudPrestamo = { ...solicitud, id };
        set((state) => ({
          contadores: { ...state.contadores, sol: n },
          solicitudesPrestamo: [...state.solicitudesPrestamo, nueva],
        }));
        return nueva;
      },

      actualizarSolicitudPrestamo: (id, datos) =>
        set((state) => ({
          solicitudesPrestamo: state.solicitudesPrestamo.map((s) =>
            s.id === id ? { ...s, ...datos } : s
          ),
        })),

      // ── Notificaciones ──
      getNotificaciones: () => get().notificaciones,

      getNotificacionesParaRol: (rol) =>
        get().notificaciones.filter((n) => n.para_rol === rol),

      crearNotificacion: (notificacion) => {
        const n = (get().contadores['notif'] ?? 0) + 1;
        const id = `notif-${String(n).padStart(3, '0')}`;
        const nueva: Notificacion = {
          ...notificacion,
          id,
          creado_en: new Date().toISOString(),
        };
        set((state) => ({
          contadores: { ...state.contadores, notif: n },
          notificaciones: [...state.notificaciones, nueva],
        }));
      },

      marcarNotificacionesLeidas: (ids) =>
        set((state) => ({
          notificaciones: state.notificaciones.map((n) =>
            ids.includes(n.id) ? { ...n, leida: true } : n
          ),
        })),

      marcarTodasLeidasParaRol: (rol) =>
        set((state) => ({
          notificaciones: state.notificaciones.map((n) =>
            n.para_rol === rol ? { ...n, leida: true } : n
          ),
        })),
    }),
    {
      name: 'tulpa-mock-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        grupos: state.grupos,
        grupo: state.grupo,
        socios: state.socios,
        movimientos: state.movimientos,
        prestamos: state.prestamos,
        solicitudesPrestamo: state.solicitudesPrestamo,
        notificaciones: state.notificaciones,
        contadores: state.contadores,
      }),
    }
  )
);