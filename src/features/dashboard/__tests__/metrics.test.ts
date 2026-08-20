import { describe, it, expect } from 'vitest';
import { calcularEstadoPagoSocio, construirResumenSocios } from '@/features/dashboard/metrics';
import type { Socio, MovimientoLedger, MovimientoTipo } from '@/types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const GRUPO_ID = 'grupo-metricas';
const CUOTA = 200000;
const MORA_PCT = 0.1;

function claveMes(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fechaISO(clave: string, dia = 1): string {
  return `${clave}-${String(dia).padStart(2, '0')}`;
}

function socio(id: string, fechaIngreso: string, estado: Socio['estado'] = 'activo'): Socio {
  return {
    id,
    grupo_id: GRUPO_ID,
    user_id: `user-${id}`,
    nombre: `Socio ${id}`,
    cuota_mensual_fija: CUOTA,
    estado,
    fecha_ingreso: fechaIngreso,
    fecha_retiro: null,
  };
}

function movimiento(
  id: string,
  socioId: string,
  fecha: string,
  tipo: MovimientoTipo = 'aporte',
  monto = CUOTA
): MovimientoLedger {
  return {
    id,
    grupo_id: GRUPO_ID,
    socio_id: socioId,
    tipo,
    monto,
    fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: null,
    creado_por: 'user-001',
    creado_en: `${fecha}T10:00:00Z`,
  };
}

// ──────────────────────────────────────────────
// Detección de mora (HU 5.2)
// ──────────────────────────────────────────────

describe('calcularEstadoPagoSocio', () => {
  it('no marca atrasos para un grupo recién creado (mes en curso)', () => {
    const clave = claveMes(0);
    const s = socio('s1', fechaISO(clave, 19));

    const res = calcularEstadoPagoSocio(s, [], MORA_PCT, null);

    expect(res.mesesAtrasados).toBe(0);
    expect(res.cuotaAtrasada).toBe(0);
    expect(res.recargoMora).toBe(0);
    expect(res.totalACobrar).toBe(CUOTA);
  });

  it('cuenta como atrasado un mes completo saltado', () => {
    const claveAnterior = claveMes(-1);
    const s = socio('s1', fechaISO(claveAnterior, 10));

    const res = calcularEstadoPagoSocio(s, [], MORA_PCT, null);

    expect(res.mesesAtrasados).toBe(1);
    expect(res.cuotaAtrasada).toBe(CUOTA);
    expect(res.recargoMora).toBe(Math.round(CUOTA * MORA_PCT));
    expect(res.totalACobrar).toBe(CUOTA + CUOTA + Math.round(CUOTA * MORA_PCT));
  });
});

// ──────────────────────────────────────────────
// Resumen de socios (tabla)
// ──────────────────────────────────────────────

describe('construirResumenSocios', () => {
  it('grupo recién creado: socio al día (debe solo la cuota del mes en curso)', () => {
    const clave = claveMes(0);
    const s = socio('s1', fechaISO(clave, 19));

    const filas = construirResumenSocios({
      socios: [s],
      movimientos: [],
      grupoId: GRUPO_ID,
      fechaInicio: fechaISO(clave, 19),
      fechaCierre: fechaISO(claveMes(12)),
      ultimoMes: null,
    });

    const fila = filas[0];
    expect(fila.estado).toBe('al_dia');
    expect(fila.cuotasEsperadas).toBe(1);
    expect(fila.cuotasPagadas).toBe(0);
    expect(fila.cuotasPendientes).toBe(1);
    expect(fila.progreso).toBe(0);
  });

  it('marca en mora a quien saltó un mes completo', () => {
    const claveInicio = claveMes(-2);
    const claveActual = claveMes(0);
    const s = socio('s1', fechaISO(claveInicio, 1));
    const movimientos = [movimiento('m1', 's1', fechaISO(claveInicio, 5))];

    const filas = construirResumenSocios({
      socios: [s],
      movimientos,
      grupoId: GRUPO_ID,
      fechaInicio: fechaISO(claveInicio, 1),
      fechaCierre: fechaISO(claveMes(12)),
      ultimoMes: claveActual,
    });

    const fila = filas[0];
    expect(fila.cuotasEsperadas).toBe(3);
    expect(fila.cuotasPagadas).toBe(1);
    expect(fila.estado).toBe('en_mora');
  });

  it('socio con mes en curso pendiente pero sin meses completados saltados: al día', () => {
    const claveInicio = claveMes(-2);
    const claveActual = claveMes(0);
    const s = socio('s1', fechaISO(claveInicio, 1));
    const movimientos = [
      movimiento('m1', 's1', fechaISO(claveInicio, 5)),
      movimiento('m2', 's1', fechaISO(claveMes(-1), 5)),
    ];

    const filas = construirResumenSocios({
      socios: [s],
      movimientos,
      grupoId: GRUPO_ID,
      fechaInicio: fechaISO(claveInicio, 1),
      fechaCierre: fechaISO(claveMes(12)),
      ultimoMes: claveActual,
    });

    const fila = filas[0];
    expect(fila.cuotasEsperadas).toBe(3);
    expect(fila.cuotasPagadas).toBe(2);
    expect(fila.estado).toBe('al_dia');
  });
});