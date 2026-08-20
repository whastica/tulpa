import { describe, it, expect, beforeEach } from 'vitest';
import { calcularLiquidacion } from '@/features/dashboard/metrics';
import { cerrarCiclo } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';
import type { Grupo, MovimientoLedger, Socio } from '@/types';

// ──────────────────────────────────────────────
// Setup: grupo activo con principal_user_id = 'user-001'
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_A = 'socio-a';
const SOCIO_B = 'socio-b';
const SOCIO_RETIRADO = 'socio-ret';
const SOCIO_OTRO_GRUPO = 'socio-otro';

const grupo: Grupo = {
  id: GRUPO_ID,
  codigo: 'TEST01',
  nombre: 'Grupo Test',
  fecha_inicio: '2025-01-01',
  fecha_cierre_pactada: '2025-12-31',
  estado: 'activo',
  tasa_interes_prestamo: 0.05,
  porcentaje_mora: 0.1,
  principal_user_id: PRINCIPAL_ID,
};

function socio(
  id: string,
  grupoId: string,
  estado: Socio['estado'],
  cuota = 100000
): Socio {
  return {
    id,
    grupo_id: grupoId,
    user_id: `user-${id}`,
    nombre: id,
    cuota_mensual_fija: cuota,
    estado,
    fecha_ingreso: '2025-01-01',
    fecha_retiro: estado === 'retirado_anticipado' ? '2025-03-01' : null,
    aceptoTerminos: true,
    fechaAceptacionTerminos: null,
  };
}

function mov(
  id: string,
  tipo: MovimientoLedger['tipo'],
  socioId: string | null,
  monto: number
): MovimientoLedger {
  return {
    id,
    grupo_id: GRUPO_ID,
    socio_id: socioId,
    tipo,
    monto,
    fecha: '2025-01-05',
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: null,
    creado_por: PRINCIPAL_ID,
    creado_en: '2025-01-05T10:00:00Z',
  };
}

function setupStore(opts: {
  socios?: Socio[];
  movimientos?: MovimientoLedger[];
  grupoEstado?: Grupo['estado'];
}) {
  useMockStore.setState({
    grupo: { ...grupo, estado: opts.grupoEstado ?? 'activo' },
    socios:
      opts.socios ?? [
        socio(SOCIO_A, GRUPO_ID, 'activo'),
        socio(SOCIO_B, GRUPO_ID, 'activo'),
      ],
    movimientos:
      opts.movimientos ??
      [
        mov('m1', 'aporte', SOCIO_A, 100000),
        mov('m2', 'aporte', SOCIO_A, 100000),
        mov('m3', 'aporte', SOCIO_A, 100000),
        mov('m4', 'aporte', SOCIO_B, 100000),
      ],
    prestamos: [],
  });
}

// ──────────────────────────────────────────────
// Tests: calcularLiquidacion
// ──────────────────────────────────────────────

describe('calcularLiquidacion', () => {
  beforeEach(() => {
    setupStore({});
  });

  it('reparte los rendimientos por igual entre socios con igual capital', () => {
    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    const a = resumen.filas.find((f) => f.socio.id === SOCIO_A)!;
    const b = resumen.filas.find((f) => f.socio.id === SOCIO_B)!;

    expect(a.capitalAhorrado).toBe(300000);
    expect(b.capitalAhorrado).toBe(100000);
    expect(a.proporcion).toBe(0.75);
    expect(b.proporcion).toBe(0.25);
  });

  it('asigna al socio con capital 3 veces mayor el triple de rendimientos', () => {
    setupStore({
      movimientos: [
        mov('m1', 'aporte', SOCIO_A, 300000),
        mov('m2', 'aporte', SOCIO_B, 100000),
        mov('m3', 'interes', null, 100000),
      ],
    });

    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    const a = resumen.filas.find((f) => f.socio.id === SOCIO_A)!;
    const b = resumen.filas.find((f) => f.socio.id === SOCIO_B)!;

    expect(a.parteRendimiento).toBe(75000);
    expect(b.parteRendimiento).toBe(25000);
    expect(a.parteRendimiento).toBe(b.parteRendimiento * 3);
    expect(a.totalAEntregar).toBe(375000);
    expect(b.totalAEntregar).toBe(125000);
  });

  it('incluye las moras pagadas como parte del capital ahorrado', () => {
    setupStore({
      movimientos: [
        mov('m1', 'aporte', SOCIO_A, 200000),
        mov('m2', 'mora', SOCIO_A, 10000),
        mov('m3', 'aporte', SOCIO_B, 100000),
      ],
    });

    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    const a = resumen.filas.find((f) => f.socio.id === SOCIO_A)!;
    expect(a.capitalAhorrado).toBe(210000);
    expect(resumen.totalCapitalActivos).toBe(310000);
  });

  it('excluye a los socios retirados anticipadamente del reparto', () => {
    setupStore({
      socios: [
        socio(SOCIO_A, GRUPO_ID, 'activo'),
        socio(SOCIO_B, GRUPO_ID, 'activo'),
        socio(SOCIO_RETIRADO, GRUPO_ID, 'retirado_anticipado'),
        socio(SOCIO_OTRO_GRUPO, 'grupo-otro', 'activo'),
      ],
      movimientos: [
        mov('m1', 'aporte', SOCIO_A, 100000),
        mov('m2', 'aporte', SOCIO_B, 100000),
        mov('m3', 'aporte', SOCIO_RETIRADO, 500000),
        mov('m4', 'aporte', SOCIO_OTRO_GRUPO, 999999),
        mov('m5', 'interes', null, 40000),
      ],
    });

    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    expect(resumen.filas.map((f) => f.socio.id).sort()).toEqual([SOCIO_A, SOCIO_B]);
    expect(resumen.totalCapitalActivos).toBe(200000);
    expect(resumen.rendimientosTotales).toBe(40000);

    const a = resumen.filas.find((f) => f.socio.id === SOCIO_A)!;
    expect(a.parteRendimiento).toBe(20000);
  });

  it('no falla cuando no hay socios activos (división por cero)', () => {
    setupStore({
      socios: [socio(SOCIO_RETIRADO, GRUPO_ID, 'retirado_anticipado')],
      movimientos: [mov('m1', 'interes', null, 1000)],
    });

    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    expect(resumen.filas).toHaveLength(0);
    expect(resumen.totalCapitalActivos).toBe(0);
    expect(resumen.rendimientosTotales).toBe(1000);
  });

  it('redondea la parte de rendimientos al peso más cercano', () => {
    setupStore({
      movimientos: [
        mov('m1', 'aporte', SOCIO_A, 300000),
        mov('m2', 'aporte', SOCIO_B, 100000),
        mov('m3', 'interes', null, 100001),
      ],
    });

    const resumen = calcularLiquidacion({
      grupo,
      socios: useMockStore.getState().socios,
      movimientos: useMockStore.getState().movimientos,
    });

    const a = resumen.filas.find((f) => f.socio.id === SOCIO_A)!;
    const b = resumen.filas.find((f) => f.socio.id === SOCIO_B)!;

    expect(a.parteRendimiento).toBe(Math.round(0.75 * 100001));
    expect(b.parteRendimiento).toBe(Math.round(0.25 * 100001));
    expect(a.parteRendimiento + b.parteRendimiento).toBe(100001);
  });
});

// ──────────────────────────────────────────────
// Tests: cerrarCiclo (flujo de confirmación)
// ──────────────────────────────────────────────

describe('cerrarCiclo', () => {
  beforeEach(() => {
    setupStore({});
  });

  it('marca el grupo como cerrado y registra la liquidación del fondo', () => {
    const resultado = cerrarCiclo({ grupoId: GRUPO_ID, userId: PRINCIPAL_ID });
    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    expect(state.grupo!.estado).toBe('cerrado');

    const liquidacion = state.movimientos.find((m) => m.tipo === 'cierre_liquidacion');
    expect(liquidacion).toBeDefined();
    expect(liquidacion!.socio_id).toBeNull();
    expect(liquidacion!.monto).toBe(400000);
  });

  it('rechaza el cierre si el usuario no es el principal', () => {
    const resultado = cerrarCiclo({ grupoId: GRUPO_ID, userId: 'user-otro' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('principal');
    }

    const state = useMockStore.getState();
    expect(state.grupo!.estado).toBe('activo');
    expect(state.movimientos.some((m) => m.tipo === 'cierre_liquidacion')).toBe(false);
  });
});