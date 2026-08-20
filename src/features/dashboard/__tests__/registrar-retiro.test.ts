import { describe, it, expect, beforeEach } from 'vitest';
import { registrarRetiro } from '@/features/dashboard/operaciones';
import { calcularFondoTotal } from '@/features/dashboard/metrics';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup: grupo activo con principal_user_id = 'user-001'
// Fondo: 10 socios × $100k × 3 meses = $3.000.000 + mora $10k = $3.010.000
// Capital del socio activo (solo aportes) = $300.000
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_ACTIVO = 'socio-act-001';
const SOCIO_INACTIVO = 'socio-inact-001';
const SOCIO_OTRO_GRUPO = 'socio-otro-001';

function setupStore(opts?: {
  prestamoActivo?: number;
  prestamoSocioId?: string;
  grupoEstado?: 'activo' | 'cerrado';
}) {
  const prestamos =
    opts?.prestamoActivo != null
      ? [
          {
            id: 'prest-activo',
            grupo_id: GRUPO_ID,
            socio_id: opts.prestamoSocioId ?? SOCIO_ACTIVO,
            monto_solicitado: opts.prestamoActivo,
            tasa_aplicada: 0.05,
            fecha_solicitud: '2025-03-20',
            estado: 'activo' as const,
            saldo_pendiente: opts.prestamoActivo,
          },
        ]
      : [];

  useMockStore.setState({
    grupo: {
      id: GRUPO_ID,
      codigo: 'TEST01',
      nombre: 'Grupo Test',
      fecha_inicio: '2025-01-01',
      fecha_cierre_pactada: '2025-12-31',
      estado: opts?.grupoEstado ?? 'activo',
      tasa_interes_prestamo: 0.05,
      porcentaje_mora: 0.10,
      principal_user_id: PRINCIPAL_ID,
    },
    socios: [
      {
        id: SOCIO_ACTIVO,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-001',
        nombre: 'Socio Activo',
        cuota_mensual_fija: 100000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
      {
        id: SOCIO_INACTIVO,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-002',
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
        user_id: 'user-socio-003',
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
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `mov-aporte-ene-${i}`,
        grupo_id: GRUPO_ID,
        socio_id: `socio-act-${String(i).padStart(3, '0')}`,
        tipo: 'aporte' as const,
        monto: 100000,
        fecha: '2025-01-05',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-01-05T10:00:00Z',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `mov-aporte-feb-${i}`,
        grupo_id: GRUPO_ID,
        socio_id: `socio-act-${String(i).padStart(3, '0')}`,
        tipo: 'aporte' as const,
        monto: 100000,
        fecha: '2025-02-05',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-02-05T10:00:00Z',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `mov-aporte-mar-${i}`,
        grupo_id: GRUPO_ID,
        socio_id: `socio-act-${String(i).padStart(3, '0')}`,
        tipo: 'aporte' as const,
        monto: 100000,
        fecha: '2025-03-05',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-03-05T10:00:00Z',
      })),
      {
        id: 'mov-mora',
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_ACTIVO,
        tipo: 'mora' as const,
        monto: 10000,
        fecha: '2025-03-31',
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: 'Mora marzo',
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-03-31T18:00:00Z',
      },
    ],
    prestamos,
  });
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('registrarRetiro', () => {
  beforeEach(() => {
    setupStore();
  });

  it('registra el retiro entregando SOLO los aportes (excluye moras)', () => {
    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const socio = state.socios.find((s) => s.id === SOCIO_ACTIVO);
    expect(socio!.estado).toBe('retirado_anticipado');
    expect(socio!.fecha_retiro).toBe('2025-04-15');

    const movimientosRetiro = state.movimientos.filter(
      (m) => m.grupo_id === GRUPO_ID && m.tipo === 'retiro_anticipado'
    );
    expect(movimientosRetiro).toHaveLength(1);
    // Capital = 3 aportes de $100k; la mora de $10k NO se entrega
    expect(movimientosRetiro[0]!.socio_id).toBe(SOCIO_ACTIVO);
    expect(movimientosRetiro[0]!.monto).toBe(300000);

    const fondo = calcularFondoTotal(state.movimientos, GRUPO_ID);
    expect(fondo).toBe(3010000 - 300000);
  });

  it('rechaza cuando la liquidez es insuficiente y no muta el store', () => {
    // Fondo = 3.010.000. Préstamo activo 2.800.000 (de otro socio) → liquidez = 210.000 < 300.000
    setupStore({ prestamoActivo: 2800000, prestamoSocioId: 'socio-act-005' });

    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.toLowerCase()).toContain('liquidez');
    }

    const state = useMockStore.getState();
    const socio = state.socios.find((s) => s.id === SOCIO_ACTIVO);
    expect(socio!.estado).toBe('activo');
    expect(socio!.fecha_retiro).toBeNull();
    expect(state.movimientos.some((m) => m.tipo === 'retiro_anticipado')).toBe(false);
  });

  it('acepta cuando la liquidez es exactamente igual al capital aportado', () => {
    // Fondo = 3.010.000. Préstamo activo 2.710.000 (de otro socio) → liquidez = 300.000 = capital
    setupStore({ prestamoActivo: 2710000, prestamoSocioId: 'socio-act-005' });

    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);
  });

  it('rechaza el retiro si el socio tiene un préstamo activo (paz y salvo)', () => {
    setupStore({ prestamoActivo: 100000 });

    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('paz y salvo');
    }

    const state = useMockStore.getState();
    expect(state.socios.find((s) => s.id === SOCIO_ACTIVO)!.estado).toBe('activo');
    expect(state.movimientos.some((m) => m.tipo === 'retiro_anticipado')).toBe(false);
  });

  it('permite el retiro si el préstamo del socio ya está pagado (paz y salvo)', () => {
    setupStore();
    useMockStore.setState((state) => ({
      prestamos: [
        ...state.prestamos,
        {
          id: 'prest-pagado',
          grupo_id: GRUPO_ID,
          socio_id: SOCIO_ACTIVO,
          monto_solicitado: 100000,
          tasa_aplicada: 0.05,
          fecha_solicitud: '2025-03-20',
          estado: 'pagado' as const,
          saldo_pendiente: 0,
        },
      ],
    }));

    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);
  });

  it('rechaza si el socio no pertenece al grupo', () => {
    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_OTRO_GRUPO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('pertenece');
    }
  });

  it('rechaza si el socio ya está retirado', () => {
    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_INACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });

  it('rechaza si el grupo no está activo', () => {
    setupStore({ grupoEstado: 'cerrado' });

    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });

  it('rechaza si el usuario no es el principal del grupo', () => {
    const resultado = registrarRetiro({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      fecha: '2025-04-15',
      userId: 'user-otro',
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('principal');
    }
  });
});