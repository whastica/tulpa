import { describe, it, expect, beforeEach } from 'vitest';
import { registrarPrestamo, solicitarPrestamoSocio } from '@/features/dashboard/operaciones';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Setup: grupo activo con principal_user_id = 'user-001'
// Ahorros: SOCIO_ACTIVO $2.000.000 (tope 2x = $4.000.000)
//          SOCIO_BAJO_AHORRO $400.000 (tope 2x = $800.000)
//          Otros 8 socios $300.000 c/u
// Fondo total = $4.800.000 → Regla 50% = $2.400.000
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-test';
const PRINCIPAL_ID = 'user-001';
const SOCIO_ACTIVO = 'socio-act-001';
const SOCIO_BAJO_AHORRO = 'socio-bajo-001';
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
        aceptoTerminos: true,
        fechaAceptacionTerminos: null,
      },
      {
        id: SOCIO_BAJO_AHORRO,
        grupo_id: GRUPO_ID,
        user_id: 'user-socio-004',
        nombre: 'Socio Bajo Ahorro',
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
      // SOCIO_ACTIVO: 20 aportes × $100k = $2.000.000 → tope 2x = $4.000.000
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `mov-act-${i}`,
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_ACTIVO,
        tipo: 'aporte' as const,
        monto: 100000,
        fecha: `2025-${String((i % 12) + 1).padStart(2, '0')}-05`,
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-01-05T10:00:00Z',
      })),
      // SOCIO_BAJO_AHORRO: 4 aportes × $100k = $400.000 → tope 2x = $800.000
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `mov-bajo-${i}`,
        grupo_id: GRUPO_ID,
        socio_id: SOCIO_BAJO_AHORRO,
        tipo: 'aporte' as const,
        monto: 100000,
        fecha: `2025-0${i + 1}-05`,
        comprobante_url: null,
        corrige_movimiento_id: null,
        nota: null,
        creado_por: PRINCIPAL_ID,
        creado_en: '2025-01-05T10:00:00Z',
      })),
      // Otros 8 socios: 3 aportes × $100k = $300.000 c/u → $2.400.000
      ...Array.from({ length: 8 }, (_, i) => {
        const socioId = `socio-act-${String(i).padStart(3, '0')}`;
        return Array.from({ length: 3 }, (_, m) => ({
          id: `mov-otro-${i}-${m}`,
          grupo_id: GRUPO_ID,
          socio_id: socioId,
          tipo: 'aporte' as const,
          monto: 100000,
          fecha: `2025-0${m + 1}-05`,
          comprobante_url: null,
          corrige_movimiento_id: null,
          nota: null,
          creado_por: PRINCIPAL_ID,
          creado_en: '2025-01-05T10:00:00Z',
        }));
      }).flat(),
    ],
    prestamos: [],
  });
}

// ──────────────────────────────────────────────
// Tests: registrarPrestamo
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

  it('aplica el tope del doble: un socio solo puede prestar hasta 2x su ahorro', () => {
    // SOCIO_BAJO_AHORRO: ahorro $400.000 → tope $800.000
    const ok = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_BAJO_AHORRO,
      monto: 800000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(ok.ok).toBe(true);

    const excede = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_BAJO_AHORRO,
      monto: 800001,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(excede.ok).toBe(false);
    if (!excede.ok) {
      expect(excede.error).toContain('ahorro');
    }
  });

  it('aplica el tope del doble aunque el fondo permita prestar más', () => {
    // Fondo $4.800.000 → 50% = $2.400.000, pero el socio solo ahorró $400.000.
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_BAJO_AHORRO,
      monto: 1000000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('ahorro');
    }
  });

  it('un socio sin ahorro no puede prestar (tope 2x = 0)', () => {
    useMockStore.setState((state) => ({
      socios: [
        ...state.socios,
        {
          id: 'socio-sin-ahorro',
          grupo_id: GRUPO_ID,
          user_id: 'user-socio-006',
          nombre: 'Socio Sin Ahorro',
          cuota_mensual_fija: 100000,
          estado: 'activo' as const,
          fecha_ingreso: '2025-01-01',
          fecha_retiro: null,
          aceptoTerminos: true,
          fechaAceptacionTerminos: null,
        },
      ],
    }));

    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: 'socio-sin-ahorro',
      monto: 100000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('ahorro');
    }
  });

  it('rechaza préstamo que excede el 50% del fondo total', () => {
    // Fondo $4.800.000 → 50% = $2.400.000. SOCIO_ACTIVO tiene tope 2x = $4.000.000,
    // por lo que la regla vinculante es la del 50%.
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 2400001,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('50%');
    }
  });

  it('acepta préstamo exacto al límite del 50%', () => {
    const resultado = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 2400000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });

    expect(resultado.ok).toBe(true);
  });

  it('rechaza préstamo que excede la liquidez disponible', () => {
    // Préstamo previo de otro socio: $2.500.000 → liquidez = 4.800.000 − 2.500.000 = $2.300.000
    // 50% = $2.400.000, tope SOCIO_ACTIVO = $4.000.000 → tope efectivo = liquidez
    useMockStore.setState((state) => ({
      prestamos: [
        ...state.prestamos,
        {
          id: 'prest-existente',
          grupo_id: GRUPO_ID,
          socio_id: 'socio-act-005',
          monto_solicitado: 2500000,
          tasa_aplicada: 0.05,
          fecha_solicitud: '2025-03-20',
          estado: 'activo' as const,
          saldo_pendiente: 2500000,
        },
      ],
    }));

    const excede = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 2300001,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(excede.ok).toBe(false);
    if (!excede.ok) {
      expect(excede.error).toMatch(/liquidez/i);
    }

    const exacto = registrarPrestamo({
      grupoId: GRUPO_ID,
      socioId: SOCIO_ACTIVO,
      monto: 2300000,
      fecha: '2025-04-10',
      userId: PRINCIPAL_ID,
    });
    expect(exacto.ok).toBe(true);
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
});

// ──────────────────────────────────────────────
// Tests: solicitarPrestamoSocio (mismo tope del doble)
// ──────────────────────────────────────────────

describe('solicitarPrestamoSocio', () => {
  beforeEach(() => {
    setupStore();
  });

  it('rechaza una solicitud que excede el tope 2x del socio', () => {
    const resultado = solicitarPrestamoSocio({
      grupoId: GRUPO_ID,
      socioId: SOCIO_BAJO_AHORRO,
      monto: 800001,
      fecha: '2025-04-10',
      userId: 'user-socio-004',
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain('ahorro');
    }
  });

  it('acepta una solicitud dentro del tope 2x del socio', () => {
    const resultado = solicitarPrestamoSocio({
      grupoId: GRUPO_ID,
      socioId: SOCIO_BAJO_AHORRO,
      monto: 800000,
      fecha: '2025-04-10',
      userId: 'user-socio-004',
    });

    expect(resultado.ok).toBe(true);
    const state = useMockStore.getState();
    const solicitud = state.solicitudesPrestamo.find(
      (s) => s.socio_id === SOCIO_BAJO_AHORRO && s.grupo_id === GRUPO_ID
    );
    expect(solicitud).toBeDefined();
    expect(solicitud!.estado).toBe('pendiente');
  });
});