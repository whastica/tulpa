import { describe, it, expect, beforeEach } from 'vitest';
import { extenderCiclo } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup: grupo activo con principal_user_id = 'user-001'
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_001 = 'socio-001';
const SOCIO_002 = 'socio-002';
const SOCIO_INACTIVO = 'socio-inact-001';
const SOCIO_OTRO_GRUPO = 'socio-otro-001';

const FECHA_ACTUAL = '2025-12-31';
const FECHA_NUEVA = '2026-12-31';

function setupStore(opts?: { grupoEstado?: 'activo' | 'cerrado' }) {
  useMockStore.setState({
    grupo: {
      id: GRUPO_ID,
      codigo: 'TEST01',
      nombre: 'Grupo Test',
      fecha_inicio: '2025-01-01',
      fecha_cierre_pactada: FECHA_ACTUAL,
      estado: opts?.grupoEstado ?? 'activo',
      tasa_interes_prestamo: 0.05,
      porcentaje_mora: 0.10,
      principal_user_id: PRINCIPAL_ID,
    },
    socios: [
      {
        id: SOCIO_001,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-001',
        nombre: 'Socio Uno',
        cuota_mensual_fija: 100000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
      {
        id: SOCIO_002,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-002',
        nombre: 'Socio Dos',
        cuota_mensual_fija: 150000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
      {
        id: SOCIO_INACTIVO,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-003',
        nombre: 'Socio Inactivo',
        cuota_mensual_fija: 100000,
        estado: 'retirado_anticipado',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: '2025-03-01',
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
      {
        id: SOCIO_OTRO_GRUPO,
        grupo_id: 'grupo-otro',
        user_id: 'user-socio-004',
        nombre: 'Socio Otro Grupo',
        cuota_mensual_fija: 100000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
    ],
    movimientos: [
      {
        id: 'mov-001',
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_001,
        tipo: 'aporte',
        monto: 100000,
        fecha: '2025-01-05',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-01-05T10:00:00Z',
      },
      {
        id: 'mov-002',
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_002,
        tipo: 'aporte',
        monto: 150000,
        fecha: '2025-01-05',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-01-05T10:00:00Z',
      },
    ],
    prestamos: [],
  });
}

function cuotasBase(overrides: Record<string, number> = {}) {
  return [
    { socioId: SOCIO_001, cuotaMensual: overrides[SOCIO_001] ?? 100000 },
    { socioId: SOCIO_002, cuotaMensual: overrides[SOCIO_002] ?? 150000 },
  ];
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('extenderCiclo', () => {
  beforeEach(() => {
    setupStore();
  });

  it('extiende la fecha y registra el movimiento de renovación sin tocar saldos', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: cuotasBase(),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    expect(state.grupo!.fecha_cierre_pactada).toBe(FECHA_NUEVA);

    const renovaciones = state.movimientos.filter((m) => m.tipo === 'renovacion');
    expect(renovaciones).toHaveLength(1);
    expect(renovaciones[0]!.socio_id).toBeNull();
    expect(renovaciones[0]!.monto).toBe(0);
    expect(renovaciones[0]!.nota).toBe('Extensión de ciclo pactada');

    expect(state.movimientos.some((m) => m.tipo === 'cambio_cuota')).toBe(false);
    expect(state.socios.find((s) => s.id === SOCIO_001)!.cuota_mensual_fija).toBe(100000);
    expect(state.socios.find((s) => s.id === SOCIO_002)!.cuota_mensual_fija).toBe(150000);
  });

  it('actualiza la cuota de los socios modificados y registra un cambio_cuota', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: cuotasBase({ [SOCIO_001]: 120000 }),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    expect(state.socios.find((s) => s.id === SOCIO_001)!.cuota_mensual_fija).toBe(120000);
    expect(state.socios.find((s) => s.id === SOCIO_002)!.cuota_mensual_fija).toBe(150000);

    const cambios = state.movimientos.filter((m) => m.tipo === 'cambio_cuota');
    expect(cambios).toHaveLength(1);
    expect(cambios[0]!.socio_id).toBe(SOCIO_001);
    expect(cambios[0]!.monto).toBe(0);
    expect(cambios[0]!.nota).toContain('100.000');
    expect(cambios[0]!.nota).toContain('120.000');
    expect(cambios[0]!.nota).toContain(`Vigente desde ${FECHA_NUEVA}`);
  });

  it('rechaza una fecha igual a la actual sin mutar el store', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_ACTUAL,
      cuotas: cuotasBase(),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('posterior');
    }

    const state = useMockStore.getState();
    expect(state.grupo!.fecha_cierre_pactada).toBe(FECHA_ACTUAL);
    expect(state.movimientos.some((m) => m.tipo === 'renovacion')).toBe(false);
  });

  it('rechaza una fecha anterior a la actual', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: '2025-06-30',
      cuotas: cuotasBase(),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('posterior');
    }
  });

  it('rechaza si el grupo no está activo', () => {
    setupStore({ grupoEstado: 'cerrado' });

    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: cuotasBase(),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });

  it('rechaza si el usuario no es el principal del grupo', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: cuotasBase(),
      userId: 'user-otro',
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('principal');
    }
  });

  it('rechaza una cuota menor o igual a 0', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: cuotasBase({ [SOCIO_001]: 0 }),
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('cuota');
    }

    const state = useMockStore.getState();
    expect(state.grupo!.fecha_cierre_pactada).toBe(FECHA_ACTUAL);
  });

  it('rechaza si una cuota corresponde a un socio de otro grupo', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: [{ socioId: SOCIO_OTRO_GRUPO, cuotaMensual: 100000 }],
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('pertenece');
    }
  });

  it('rechaza ajustar la cuota de un socio ya retirado', () => {
    const resultado = extenderCiclo({
      grupoId: GRUPO_ID,
      nuevaFechaCierre: FECHA_NUEVA,
      cuotas: [{ socioId: SOCIO_INACTIVO, cuotaMensual: 100000 }],
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });
});