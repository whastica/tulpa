import type { Grupo, MovimientoLedger, Prestamo, Socio } from '@/types';
import { MESES_CORTO } from '@/lib/format';

// ──────────────────────────────────────────────
// Tipos de salida
// ──────────────────────────────────────────────

export type EstadoSocioFinanciero = 'al_dia' | 'en_mora' | 'retirado_anticipado';

export type FilaSocioResumen = {
  socio: Socio;
  aporteAcumulado: number;
  cuotasEsperadas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  progreso: number;
  estado: EstadoSocioFinanciero;
};

export type ResumenPrestamos = {
  cantidad: number;
  total: number;
};

export type MetricasDashboard = {
  fondoTotal: number;
  liquidez: number;
  prestamosActivos: ResumenPrestamos;
  rendimientos: number;
  filas: FilaSocioResumen[];
  serie: PuntoSerie[];
  ultimoMes: string | null;
};

export type PuntoSerie = {
  mes: string;
  etiqueta: string;
  fondoTotal: number;
};

// ──────────────────────────────────────────────
// Detección automática de mora (HU 5.2)
// ──────────────────────────────────────────────

export type EstadoPagoSocio = {
  mesesAtrasados: number;
  cuotaAtrasada: number;
  cuotaActual: number;
  recargoMora: number;
  totalACobrar: number;
};

export function calcularEstadoPagoSocio(
  socio: Socio,
  movimientos: MovimientoLedger[],
  grupoPorcentajeMora: number,
  ultimoMesConAportes: string | null
): EstadoPagoSocio {
  const hoy = new Date();
  const claveActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesFin = ultimoMesConAportes && ultimoMesConAportes > claveActual
    ? ultimoMesConAportes
    : claveActual;

  const cuota = socio.cuota_mensual_fija;
  const claveInicio = socio.fecha_ingreso.slice(0, 7);

  const aportesDelSocio = movimientos.filter(
    (m) => m.socio_id === socio.id && m.tipo === 'aporte'
  );

  let mesesAtrasados = 0;
  const [anioInicio, mesInicio] = claveInicio.split('-').map(Number);
  const [anioFin, mesFinNum] = mesFin.split('-').map(Number);
  let anio = anioInicio;
  let mes = mesInicio;

  while (anio < anioFin || (anio === anioFin && mes < mesFinNum)) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`;
    const tieneAporte = aportesDelSocio.some((m) => m.fecha.slice(0, 7) === clave);
    if (!tieneAporte) mesesAtrasados++;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }

  const cuotaAtrasada = cuota * mesesAtrasados;
  const cuotaActual = cuota;
  const recargoMora = Math.round(cuota * mesesAtrasados * grupoPorcentajeMora);
  const totalACobrar = cuotaAtrasada + cuotaActual + recargoMora;

  return { mesesAtrasados, cuotaAtrasada, cuotaActual, recargoMora, totalACobrar };
}

export function movimientosDelGrupo(
  movimientos: MovimientoLedger[],
  grupoId: string
): MovimientoLedger[] {
  return movimientos.filter((m) => m.grupo_id === grupoId);
}

function mesClave(fecha: string): string {
  return fecha.slice(0, 7);
}

export function etiquetaMes(clave: string): string {
  const [year, month] = clave.split('-').map(Number);
  const mes = MESES_CORTO[(month ?? 1) - 1] ?? '';
  const corto = String(year ?? '').slice(2);
  return `${mes} ${corto}`;
}

function mesesEntre(inicio: string, fin: string): number {
  const [yi, mi] = inicio.split('-').map(Number);
  const [yf, mf] = fin.split('-').map(Number);
  return (yf - yi) * 12 + (mf - mi) + 1;
}

export function ultimoMesConMovimientos(
  movimientos: MovimientoLedger[],
  grupoId: string
): string | null {
  const fechas = movimientosDelGrupo(movimientos, grupoId).map((m) => m.fecha);
  if (fechas.length === 0) return null;
  fechas.sort();
  return mesClave(fechas[fechas.length - 1]);
}

// ──────────────────────────────────────────────
// Tarjetas resumen (spec: Fondo Total, Liquidez, Préstamos Activos, Rendimientos)
// ──────────────────────────────────────────────

/**
 * Fondo Total = (aportes + moras + pagos_prestamo + renovacion) − retiros_anticipados.
 * `pago_prestamo` incluye capital + interés (el movimiento `interes` es solo
 * informativo para rendimientos y no se suma aquí para evitar doble conteo).
 * `renovacion` representa el fondo heredado al abrir un nuevo ciclo.
 */
export function calcularFondoTotal(movimientos: MovimientoLedger[], grupoId: string): number {
  let total = 0;
  for (const m of movimientosDelGrupo(movimientos, grupoId)) {
    switch (m.tipo) {
      case 'aporte':
      case 'mora':
      case 'pago_prestamo':
      case 'renovacion':
        total += m.monto;
        break;
      case 'retiro_anticipado':
        total -= m.monto;
        break;
      default:
        break;
    }
  }
  return total;
}

export function calcularPrestamosActivos(
  prestamos: Prestamo[],
  grupoId: string
): ResumenPrestamos {
  const activos = prestamos.filter((p) => p.grupo_id === grupoId && p.estado === 'activo');
  return {
    cantidad: activos.length,
    total: activos.reduce((sum, p) => sum + p.saldo_pendiente, 0),
  };
}

export function calcularLiquidez(fondoTotal: number, prestamosActivosTotal: number): number {
  return fondoTotal - prestamosActivosTotal;
}

export function calcularRendimientosTotales(
  movimientos: MovimientoLedger[],
  grupoId: string
): number {
  return movimientosDelGrupo(movimientos, grupoId)
    .filter((m) => m.tipo === 'interes' || m.tipo === 'mora')
    .reduce((sum, m) => sum + m.monto, 0);
}

// ──────────────────────────────────────────────
// Tabla de socios
// ──────────────────────────────────────────────

export function construirResumenSocios(opts: {
  socios: Socio[];
  movimientos: MovimientoLedger[];
  grupoId: string;
  fechaInicio: string;
  fechaCierre: string;
  ultimoMes: string | null;
}): FilaSocioResumen[] {
  const { socios, movimientos, grupoId, fechaInicio, fechaCierre, ultimoMes } = opts;
  const sociosDelGrupo = socios.filter((s) => s.grupo_id === grupoId);
  const aportesPorSocio = new Map<string, number>();

  for (const m of movimientosDelGrupo(movimientos, grupoId)) {
    if (m.tipo !== 'aporte' || !m.socio_id) continue;
    aportesPorSocio.set(m.socio_id, (aportesPorSocio.get(m.socio_id) ?? 0) + m.monto);
  }

  return sociosDelGrupo.map((socio) => {
    const cuota = socio.cuota_mensual_fija > 0 ? socio.cuota_mensual_fija : 0;

    let fechaFinSocio = ultimoMes ? `${ultimoMes}-01` : fechaInicio;
    if (socio.estado === 'retirado_anticipado' && socio.fecha_retiro) {
      fechaFinSocio = socio.fecha_retiro;
    }
    if (fechaFinSocio > fechaCierre) fechaFinSocio = fechaCierre;
    if (fechaFinSocio < fechaInicio) fechaFinSocio = fechaInicio;

    const cuotasEsperadas = Math.max(0, mesesEntre(fechaInicio, fechaFinSocio));

    const aporteAcumulado = aportesPorSocio.get(socio.id) ?? 0;
    let cuotasPagadas = cuota > 0 ? Math.floor(aporteAcumulado / cuota) : 0;
    cuotasPagadas = Math.min(cuotasPagadas, cuotasEsperadas);
    const cuotasPendientes = Math.max(0, cuotasEsperadas - cuotasPagadas);
    const progreso = cuotasEsperadas > 0 ? cuotasPagadas / cuotasEsperadas : 0;

    let estado: EstadoSocioFinanciero;
    if (socio.estado === 'retirado_anticipado') {
      estado = 'retirado_anticipado';
    } else if (cuotasPagadas < cuotasEsperadas - 1) {
      estado = 'en_mora';
    } else {
      estado = 'al_dia';
    }

    return {
      socio,
      aporteAcumulado,
      cuotasEsperadas,
      cuotasPagadas,
      cuotasPendientes,
      progreso,
      estado,
    };
  });
}

// ──────────────────────────────────────────────
// Gráfico de evolución mensual del Fondo Total
// ──────────────────────────────────────────────

export function construirSerieFondoMensual(opts: {
  movimientos: MovimientoLedger[];
  grupoId: string;
  fechaInicio: string;
}): PuntoSerie[] {
  const { movimientos, grupoId, fechaInicio } = opts;
  const movs = movimientosDelGrupo(movimientos, grupoId)
    .filter((m) =>
      ['aporte', 'mora', 'pago_prestamo', 'renovacion', 'retiro_anticipado'].includes(m.tipo)
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (movs.length === 0) return [];

  const inicioMes = mesClave(fechaInicio);
  const ultimoMes = mesClave(movs[movs.length - 1].fecha);

  const meses: string[] = [];
  let y = Number(inicioMes.split('-')[0]);
  let m = Number(inicioMes.split('-')[1]);
  const yU = Number(ultimoMes.split('-')[0]);
  const mU = Number(ultimoMes.split('-')[1]);
  while (y < yU || (y === yU && m <= mU)) {
    meses.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  let total = 0;
  let idx = 0;
  return meses.map((clave) => {
    while (idx < movs.length && mesClave(movs[idx].fecha) <= clave) {
      const mv = movs[idx];
      total += mv.tipo === 'retiro_anticipado' ? -mv.monto : mv.monto;
      idx += 1;
    }
    return { mes: clave, etiqueta: etiquetaMes(clave), fondoTotal: total };
  });
}

// ──────────────────────────────────────────────
// Métricas agregadas de un grupo
// ──────────────────────────────────────────────

export function calcularMetricasGrupo(opts: {
  grupo: Grupo;
  socios: Socio[];
  movimientos: MovimientoLedger[];
  prestamos: Prestamo[];
}): MetricasDashboard {
  const { grupo, socios, movimientos, prestamos } = opts;
  const fondoTotal = calcularFondoTotal(movimientos, grupo.id);
  const prestamosActivos = calcularPrestamosActivos(prestamos, grupo.id);
  const liquidez = calcularLiquidez(fondoTotal, prestamosActivos.total);
  const rendimientos = calcularRendimientosTotales(movimientos, grupo.id);
  const ultimoMes = ultimoMesConMovimientos(movimientos, grupo.id);
  const filas = construirResumenSocios({
    socios,
    movimientos,
    grupoId: grupo.id,
    fechaInicio: grupo.fecha_inicio,
    fechaCierre: grupo.fecha_cierre_pactada,
    ultimoMes,
  });
  const serie = construirSerieFondoMensual({
    movimientos,
    grupoId: grupo.id,
    fechaInicio: grupo.fecha_inicio,
  });

  return { fondoTotal, liquidez, prestamosActivos, rendimientos, filas, serie, ultimoMes };
}