import { describe, it, expect, beforeEach } from 'vitest';
import { aceptarReglamento } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const SOCIO_ID = 'socio-001';
const USER_ID = 'user-socio-001';

function setupStore(opts?: { aceptoTerminos?: boolean; fechaAceptacion?: string | null }) {
  useMockStore.setState({
    grupo: {
      id: GRUPO_ID,
      codigo: 'TEST01',
      nombre: 'Grupo Test',
      fecha_inicio: '2025-01-01',
      fecha_cierre_pactada: '2025-12-31',
      estado: 'activo',
      tasa_interes_prestamo: 0.05,
      porcentaje_mora: 0.1,
      principal_user_id: 'user-001',
    },
    socios: [
      {
        id: SOCIO_ID,
        grupo_id: GRUPO_ID,
        user_id: USER_ID,
        nombre: 'Socio Uno',
        cuota_mensual_fija: 100000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
        aceptoTerminos: opts?.aceptoTerminos ?? false,
        fechaAceptacionTerminos: opts?.fechaAceptacion ?? null,
      },
    ],
    movimientos: [],
    prestamos: [],
  });
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('aceptarReglamento', () => {
  beforeEach(() => {
    setupStore();
  });

  it('marca el socio con aceptoTerminos true y registra la fecha de aceptación', () => {
    const resultado = aceptarReglamento({ socioId: SOCIO_ID, userId: USER_ID });
    expect(resultado.ok).toBe(true);

    const socio = useMockStore.getState().socios.find((s) => s.id === SOCIO_ID)!;
    expect(socio.aceptoTerminos).toBe(true);
    expect(socio.fechaAceptacionTerminos).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('rechaza si el userId no corresponde al socio', () => {
    const resultado = aceptarReglamento({ socioId: SOCIO_ID, userId: 'user-otro' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('propio');
    }

    const socio = useMockStore.getState().socios.find((s) => s.id === SOCIO_ID)!;
    expect(socio.aceptoTerminos).toBe(false);
  });

  it('rechaza si el socio ya aceptó el reglamento', () => {
    setupStore({ aceptoTerminos: true, fechaAceptacion: '2025-01-01 10:00' });

    const resultado = aceptarReglamento({ socioId: SOCIO_ID, userId: USER_ID });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('Ya aceptaste');
    }
  });

  it('rechaza si el socio no existe', () => {
    const resultado = aceptarReglamento({ socioId: 'socio-inexistente', userId: USER_ID });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('no existe');
    }
  });
});