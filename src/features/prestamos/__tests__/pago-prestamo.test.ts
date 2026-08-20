import { describe, it, expect, beforeEach } from 'vitest';
import { registrarPagoPrestamo } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_ID = 'socio-001';
const PRESTAMO_ID = 'prest-001';

function setupStore(opts?: { saldoPendiente?: number; tasa?: number }) {
  const saldoPendiente = opts?.saldoPendiente ?? 800000;
  const tasa = opts?.tasa ?? 0.05;

  useMockStore.setState({
    grupo: {
      id: GRUPO_ID,
      codigo: 'TEST01',
      nombre: 'Grupo Test',
      fecha_inicio: '2025-01-01',
      fecha_cierre_pactada: '2025-12-31',
      estado: 'activo',
      tasa_interes_prestamo: tasa,
      porcentaje_mora: 0.10,
      principal_user_id: PRINCIPAL_ID,
    },
    socios: [
      {
        id: SOCIO_ID,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-001',
        nombre: 'Socio Test',
        cuota_mensual_fija: 100000,
        estado: 'activo',
        fecha_ingreso: '2025-01-01',
        fecha_retiro: null,
      },
    ],
    movimientos: [],
    prestamos: [
      {
        id: PRESTAMO_ID,
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_ID,
        monto_solicitado: 800000,
        tasa_aplicada: tasa,
        fecha_solicitud: '2025-05-15',
        estado: 'activo',
        saldo_pendiente: saldoPendiente,
      },
    ],
  });
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('registrarPagoPrestamo', () => {
  beforeEach(() => {
    setupStore();
  });

  it('registra pago parcial (capital + interés) y actualiza saldo', () => {
    // Saldo: 800.000, tasa: 5% → interés esperado = 40.000
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 200000,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const prestamo = state.prestamos.find((p) => p.id === PRESTAMO_ID);
    expect(prestamo!.saldo_pendiente).toBe(600000);
    expect(prestamo!.estado).toBe('activo');

    const movCapital = state.movimientos.find(
      (m) => m.tipo === 'pago_prestamo' && m.socio_id === SOCIO_ID
    );
    expect(movCapital).toBeDefined();
    expect(movCapital!.monto).toBe(200000);

    const movInteres = state.movimientos.find(
      (m) => m.tipo === 'interes' && m.socio_id === SOCIO_ID
    );
    expect(movInteres).toBeDefined();
    expect(movInteres!.monto).toBe(40000);
  });

  it('cancela préstamo cuando capital = saldo pendiente', () => {
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 800000,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const prestamo = state.prestamos.find((p) => p.id === PRESTAMO_ID);
    expect(prestamo!.saldo_pendiente).toBe(0);
    expect(prestamo!.estado).toBe('pagado');

    const mov = state.movimientos.find((m) => m.tipo === 'pago_prestamo');
    expect(mov!.nota).toBe('Préstamo cancelado');
  });

  it('rechaza capital mayor al saldo pendiente', () => {
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 900000,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('saldo pendiente');
    }
  });

  it('permite interés menor al esperado del período (no obligatorio)', () => {
    // Interés esperado = 800.000 × 5% = 40.000, pero se paga menos
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 200000,
      montoInteres: 30000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const prestamo = state.prestamos.find((p) => p.id === PRESTAMO_ID);
    expect(prestamo!.saldo_pendiente).toBe(600000);

    const movInteres = state.movimientos.find((m) => m.tipo === 'interes');
    expect(movInteres).toBeDefined();
    expect(movInteres!.monto).toBe(30000);
  });

  it('rechaza cuando ambos montos son 0', () => {
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 0,
      montoInteres: 0,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('al menos un monto');
    }
  });

  it('permite pago solo de interés (capital = 0) sin crear movimiento de capital', () => {
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 0,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);

    const state = useMockStore.getState();
    const prestamo = state.prestamos.find((p) => p.id === PRESTAMO_ID);
    expect(prestamo!.saldo_pendiente).toBe(800000);

    const movInteres = state.movimientos.find((m) => m.tipo === 'interes');
    expect(movInteres).toBeDefined();
    expect(movInteres!.monto).toBe(40000);

    const movCapital = state.movimientos.find((m) => m.tipo === 'pago_prestamo');
    expect(movCapital).toBeUndefined();
  });

  it('rechaza si el préstamo ya está pagado', () => {
    useMockStore.setState((state) => ({
      prestamos: state.prestamos.map((p) =>
        p.id === PRESTAMO_ID ? { ...p, estado: 'pagado' as const } : p
      ),
    }));

    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 100000,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('pagado');
    }
  });

  it('rechaza si no es principal', () => {
    const resultado = registrarPagoPrestamo({
      grupoId: GRUPO_ID,
      prestamoId: PRESTAMO_ID,
      montoCapital: 100000,
      montoInteres: 40000,
      fecha: '2025-06-20',
      userId: 'user-otro',
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('principal');
    }
  });
});
