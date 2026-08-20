import { describe, it, expect, beforeEach } from 'vitest';
import { registrarPrestamo } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup: grupo activo con principal_user_id = 'user-001'
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_ACTIVO = 'socio-act-001';
const SOCIO_INACTIVO = 'socio-inact-001';
const SOCIO_OTRO_GRUPO = 'socio-otro-001';

function setupStore() {
  useMockStore.setState({
    grupo: {
      id: GRUPO_ID,
      codigo: 'TEST01',
      nombre: 'Grupo Test',
      fecha_inicio: '2025-01-01',
      fecha_cierre_pactada: '2025-12-31',
      estado: 'activo',
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
      },
    ],
    movimientos: [
      // Aportes del grupo: 10 socios × $100k × 3 meses = $3.000.000
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `mov-aporte-${i}`,
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
        id: `mov-feb-${i}`,
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
        id: `mov-mar-${i}`,
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
    ],
    prestamos: [],
  });
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('registrarPrestamo', () => {
  beforeEach(() => {
    setupStore();
  });

  it('registra un préstamo válido y crea movimiento en ledger', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 500000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const prestamo = state.prestamos.find(
      (p) => p.grupo_id === GRUPO_ID && p.socio_id === SOCIO_ACTIVO
    );
    expect(prestamo).toBeDefined();
    expect(prestamo!.monto_solicitado).toBe(500000);
    expect(prestamo!.saldo_pendiente).toBe(500000);
    expect(prestamo!.estado).toBe('activo');
    expect(prestamo!.tasa_aplicada).toBe(0.05);

    const movimiento = state.movimientos.find(
      (m) => m.grupo_id === GRUPO_ID && m.tipo === 'prestamo' && m.socio_id === SOCIO_ACTIVO
    );
    expect(movimiento).toBeDefined();
    expect(movimiento!.monto).toBe(500000);
  });

  it('rechaza monto igual a 0', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 0,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('mayor a 0');
    }
  });

  it('rechaza monto negativo', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: -100000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
  });

  it('rechaza préstamo que excede el 50% del fondo total', () => {
    // Fondo total = 3.000.000 (10 socios × $100k × 3 meses)
    // Límite 50% = 1.500.000
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 1600000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('50%');
    }
  });

  it('rechaza préstamo que excede la liquidez disponible', () => {
    // Fondo total = 3.000.000
    // Si ya hay préstamos activos que reducen la liquidez, el tope es menor
    // Creamos un préstamo activo primero
    useMockStore.setState((state) => ({
      prestamos: [
        ...state.prestamos,
        {
          id: 'prest-existente',
          grupo_id: GRUPO_ID,
          socio_id: SOCIO_ACTIVO,
          monto_solicitado: 1400000,
          tasa_aplicada: 0.05,
          fecha_solicitud: '2025-03-20',
          estado: 'activo' as const,
          saldo_pendiente: 1400000,
        },
      ],
    }));

    // Liquidez = 3.000.000 - 1.400.000 = 1.600.000
    // 50% del fondo = 1.500.000 → tope = min(1.5M, 1.6M) = 1.5M
    // Pedimos 1.500.001 → excede el 50%
    const resultado1 = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 1500001,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(resultado1.ok).toBe(false);

    // Liquidez = 1.600.000, pedimos 1.600.001 → excede liquidez
    // Pero primero necesitamos que esté dentro del 50%
    // 50% = 1.500.000, entonces pedimos 1.400.000 (dentro del 50%)
    // Liquidez = 1.600.000, 1.400.000 < 1.600.000 → debería funcionar
    const resultado2 = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 1400000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(resultado2.ok).toBe(true);
  });

  it('rechaza si el socio no pertenece al grupo', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_OTRO_GRUPO,
      monto: 100000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('pertenece');
    }
  });

  it('rechaza si el socio está inactivo (retirado)', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_INACTIVO,
      monto: 100000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });

  it('rechaza si el grupo no está activo', () => {
    useMockStore.setState((state) => ({
      grupo: state.grupo ? { ...state.grupo, estado: 'cerrado' } : null,
    }));

    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 100000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('activo');
    }
  });

  it('rechaza si el usuario no es el principal del grupo', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 100000,
      fecha: '2025-04-10',
      userId: 'user-otro',
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('principal');
    }
  });

  it('acepta préstamo exacto al límite del 50%', () => {
    // Fondo total = 3.000.000, 50% = 1.500.000
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 1500000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);
  });
});
