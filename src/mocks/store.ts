import { create } from 'zustand';
import type { Grupo, Socio, MovimientoLedger, Prestamo } from '@/types';
import {
  movimientosIniciales,
  prestamosIniciales,
} from './data';

// ──────────────────────────────────────────────
// Store types
// ──────────────────────────────────────────────

type MockStore = {
  // ── State ──
  grupo: Grupo | null;
  socios: Socio[];
  movimientos: MovimientoLedger[];
  prestamos: Prestamo[];

  // ── Read: Grupo ──
  getGrupo: () => Grupo | null;
  crearGrupo: (datos: Omit<Grupo, 'id' | 'estado'>) => Grupo;
  actualizarGrupo: (datos: Partial<Grupo>) => void;

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
};

// ──────────────────────────────────────────────
// ID generator
// ──────────────────────────────────────────────

let contadorId = 1;
function generarId(prefijo: string): string {
  contadorId++;
  return `${prefijo}-${String(contadorId).padStart(3, '0')}`;
}

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useMockStore = create<MockStore>((set, get) => ({
  // ── State ──
  grupo: null,
  socios: [],
  movimientos: movimientosIniciales,
  prestamos: prestamosIniciales,

  // ── Grupo ──
  getGrupo: () => get().grupo,

  crearGrupo: (datos) => {
    const id = generarId('grupo');
    const nuevo: Grupo = {
      ...datos,
      id,
      estado: 'activo',
    };
    set({ grupo: nuevo });
    return nuevo;
  },

  actualizarGrupo: (datos) =>
    set((state) => ({
      grupo: state.grupo ? { ...state.grupo, ...datos } : null,
    })),

  // ── Socios ──
  getSocios: () => get().socios,

  getSocioPorId: (id) => get().socios.find((s) => s.id === id),

  getSociosPorGrupo: (grupoId) =>
    get().socios.filter((s) => s.grupo_id === grupoId),

  getSociosActivos: () =>
    get().socios.filter((s) => s.estado === 'activo'),

  registrarSocios: (socios) => {
    const nuevosSocios: Socio[] = socios.map((s) => ({
      ...s,
      id: generarId('socio'),
    }));
    set((state) => ({
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
    const id = generarId('mov');
    const ahora = new Date().toISOString();
    const nuevo: MovimientoLedger = {
      ...movimiento,
      id,
      creado_en: ahora,
    };
    set((state) => ({
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
    const id = generarId('prest');
    const nuevo: Prestamo = { ...prestamo, id };
    set((state) => ({
      prestamos: [...state.prestamos, nuevo],
    }));
  },

  actualizarPrestamo: (id, datos) =>
    set((state) => ({
      prestamos: state.prestamos.map((p) =>
        p.id === id ? { ...p, ...datos } : p
      ),
    })),
}));
