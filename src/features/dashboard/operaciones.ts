'use client';

import { useMockStore } from '@/mocks';
import type { Grupo, Prestamo } from '@/types';
import { calcularFondoTotal, calcularLiquidez, calcularRendimientosTotales } from './metrics';

// ──────────────────────────────────────────────
// Contrato de la capa de operaciones.
// Modela el comportamiento de una Server Action:
// validación Zod en el formulario + reglas de negocio aquí.
// Swap futuro a Supabase RLS / RPC sin tocar la UI.
// ──────────────────────────────────────────────

export type ResultadoOperacion =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

// Guard análogo a RLS: solo el principal del grupo puede operar.
function esPrincipalDe(grupo: Grupo, userId: string | null | undefined): boolean {
  return !!userId && grupo.principal_user_id === userId;
}

function obtenerGrupo(grupoId: string): Grupo | null {
  const state = useMockStore.getState();
  return state.grupo && state.grupo.id === grupoId ? state.grupo : null;
}

function validarPrincipal(grupoId: string, userId: string | null | undefined): ResultadoOperacion {
  const state = useMockStore.getState();
  const grupo = obtenerGrupo(grupoId);
  if (!grupo) return { ok: false, error: 'El grupo no existe.' };
  if (grupo.estado !== 'activo') return { ok: false, error: 'El grupo no está activo.' };
  if (!esPrincipalDe(grupo, userId)) {
    return { ok: false, error: 'Solo el principal del grupo puede realizar operaciones.' };
  }
  return { ok: true };
}

function hoyISO(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function unAnioDespues(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${(y ?? 0) + 1}-${String(m ?? 1).padStart(2, '0')}-${String(d ?? 1).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────
// Registrar Aporte / Mora
// ──────────────────────────────────────────────

export function registrarAporte(opts: {
  grupoId: string;
  tipo: 'aporte' | 'mora';
  socioId: string;
  monto: number;
  fecha: string;
  nota?: string;
  comprobanteUrl?: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const socio = state.getSocioPorId(opts.socioId);
  if (!socio || socio.grupo_id !== grupo.id) {
    return { ok: false, error: 'El socio no pertenece al grupo.' };
  }
  if (socio.estado !== 'activo') {
    return { ok: false, error: 'El socio no está activo.' };
  }
  if (!opts.monto || opts.monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a 0.' };
  }

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: socio.id,
    tipo: opts.tipo,
    monto: opts.monto,
    fecha: opts.fecha,
    comprobante_url: opts.comprobanteUrl?.trim() ? opts.comprobanteUrl.trim() : null,
    corrige_movimiento_id: null,
    nota: opts.nota?.trim() ? opts.nota.trim() : null,
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Registrar Aporte con Mora (HU 5.2)
// ──────────────────────────────────────────────

export function registrarAporteConMora(opts: {
  grupoId: string;
  socioId: string;
  cuotaAtrasada: number;
  cuotaActual: number;
  recargoMora: number;
  fecha: string;
  comprobanteUrl?: string;
  nota?: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const socio = state.getSocioPorId(opts.socioId);
  if (!socio || socio.grupo_id !== grupo.id) {
    return { ok: false, error: 'El socio no pertenece al grupo.' };
  }
  if (socio.estado !== 'activo') {
    return { ok: false, error: 'El socio no está activo.' };
  }

  const total = opts.cuotaAtrasada + opts.cuotaActual;
  if (total <= 0) {
    return { ok: false, error: 'El total a cobrar debe ser mayor a 0.' };
  }
  if (opts.recargoMora <= 0) {
    return { ok: false, error: 'El recargo por mora debe ser mayor a 0.' };
  }

  const comprobante = opts.comprobanteUrl?.trim() ? opts.comprobanteUrl.trim() : null;
  const notaBase = opts.nota?.trim() ?? '';

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: socio.id,
    tipo: 'aporte',
    monto: total,
    fecha: opts.fecha,
    comprobante_url: comprobante,
    corrige_movimiento_id: null,
    nota: notaBase || `Cuota${opts.cuotaAtrasada > opts.cuotaActual ? 's' : ''} atrasada(s) + cuota actual`,
    creado_por: opts.userId ?? '',
  });

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: socio.id,
    tipo: 'mora',
    monto: opts.recargoMora,
    fecha: opts.fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: 'Recargo por mora',
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Solicitar Préstamo (regla: máx 50% del fondo y ≤ liquidez)
// ──────────────────────────────────────────────

export function registrarPrestamo(opts: {
  grupoId: string;
  socioId: string;
  monto: number;
  fecha: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const socio = state.getSocioPorId(opts.socioId);
  if (!socio || socio.grupo_id !== grupo.id) {
    return { ok: false, error: 'El socio no pertenece al grupo.' };
  }
  if (socio.estado !== 'activo') {
    return { ok: false, error: 'El socio no está activo.' };
  }
  if (!opts.monto || opts.monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a 0.' };
  }

  const movimientos = state.getMovimientosPorGrupo(grupo.id);
  const prestamosActivos = state
    .getPrestamos()
    .filter((p) => p.grupo_id === grupo.id && p.estado === 'activo')
    .reduce((sum, p) => sum + p.saldo_pendiente, 0);
  const fondoTotal = calcularFondoTotal(movimientos, grupo.id);
  const liquidez = calcularLiquidez(fondoTotal, prestamosActivos);
  const montoMaximo = fondoTotal * 0.5;

  if (opts.monto > montoMaximo) {
    return {
      ok: false,
      error: `El monto supera el límite permitido (máximo 50% del fondo: $${montoMaximo.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > liquidez) {
    return {
      ok: false,
      error: `Liquidez insuficiente para el desembolso (disponible: $${liquidez.toLocaleString('es-CO')}).`,
    };
  }

  state.registrarPrestamo({
    grupo_id: grupo.id,
    socio_id: socio.id,
    monto_solicitado: opts.monto,
    tasa_aplicada: grupo.tasa_interes_prestamo,
    fecha_solicitud: opts.fecha,
    estado: 'activo',
    saldo_pendiente: opts.monto,
  });

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: socio.id,
    tipo: 'prestamo',
    monto: opts.monto,
    fecha: opts.fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: 'Préstamo aprobado por principal',
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Pago de Préstamo (interés simple sobre saldo)
// ──────────────────────────────────────────────

export function registrarPagoPrestamo(opts: {
  grupoId: string;
  prestamoId: string;
  monto: number;
  fecha: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const prestamo = state.getPrestamoPorId(opts.prestamoId);
  if (!prestamo || prestamo.grupo_id !== grupo.id) {
    return { ok: false, error: 'El préstamo no existe en este grupo.' };
  }
  if (prestamo.estado !== 'activo') {
    return { ok: false, error: 'El préstamo ya está pagado.' };
  }
  if (!opts.monto || opts.monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a 0.' };
  }

  const interes = Math.round(prestamo.saldo_pendiente * prestamo.tasa_aplicada);
  const montoMaximo = prestamo.saldo_pendiente + interes;

  if (opts.monto < interes) {
    return {
      ok: false,
      error: `El abono debe cubrir al menos el interés del período ($${interes.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > montoMaximo) {
    return {
      ok: false,
      error: `El abono supera el saldo total ($${montoMaximo.toLocaleString('es-CO')}).`,
    };
  }

  const capital = opts.monto - interes;
  const nuevoSaldo = Math.max(0, prestamo.saldo_pendiente - capital);
  const estado: Prestamo['estado'] = nuevoSaldo <= 0 ? 'pagado' : 'activo';

  state.actualizarPrestamo(prestamo.id, { saldo_pendiente: nuevoSaldo, estado });

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: prestamo.socio_id,
    tipo: 'pago_prestamo',
    monto: opts.monto,
    fecha: opts.fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: estado === 'pagado' ? 'Préstamo cancelado' : 'Abono a préstamo',
    creado_por: opts.userId ?? '',
  });

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: prestamo.socio_id,
    tipo: 'interes',
    monto: interes,
    fecha: opts.fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: 'Interés del período por pago de préstamo',
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Retiro Anticipado (regla: liquidez ≥ capital aportado)
// ──────────────────────────────────────────────

export function registrarRetiro(opts: {
  grupoId: string;
  socioId: string;
  fecha: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const socio = state.getSocioPorId(opts.socioId);
  if (!socio || socio.grupo_id !== grupo.id) {
    return { ok: false, error: 'El socio no pertenece al grupo.' };
  }
  if (socio.estado !== 'activo') {
    return { ok: false, error: 'El socio ya no está activo.' };
  }

  const aporteTotal = state
    .getMovimientosPorSocio(socio.id)
    .filter((m) => m.tipo === 'aporte')
    .reduce((sum, m) => sum + m.monto, 0);

  const movimientos = state.getMovimientosPorGrupo(grupo.id);
  const prestamosActivos = state
    .getPrestamos()
    .filter((p) => p.grupo_id === grupo.id && p.estado === 'activo')
    .reduce((sum, p) => sum + p.saldo_pendiente, 0);
  const fondoTotal = calcularFondoTotal(movimientos, grupo.id);
  const liquidez = calcularLiquidez(fondoTotal, prestamosActivos);

  if (liquidez < aporteTotal) {
    return {
      ok: false,
      error:
        'No hay liquidez suficiente para procesar el retiro. Debe esperar la recuperación de préstamos activos.',
    };
  }

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: socio.id,
    tipo: 'retiro_anticipado',
    monto: aporteTotal,
    fecha: opts.fecha,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: `Retiro anticipado. Capital aportado: $${aporteTotal.toLocaleString('es-CO')}`,
    creado_por: opts.userId ?? '',
  });

  state.actualizarSocio(socio.id, {
    estado: 'retirado_anticipado',
    fecha_retiro: opts.fecha,
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Cierre de ciclo
// ──────────────────────────────────────────────

export function cerrarCiclo(opts: {
  grupoId: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const fondoTotal = calcularFondoTotal(state.getMovimientosPorGrupo(grupo.id), grupo.id);

  state.actualizarGrupo({ estado: 'cerrado' });
  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: null,
    tipo: 'cierre_liquidacion',
    monto: fondoTotal,
    fecha: hoyISO(),
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: 'Cierre de ciclo. Liquidación del fondo',
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Renovación de ciclo (hereda el fondo del ciclo cerrado)
// ──────────────────────────────────────────────

export function renovarCiclo(opts: {
  grupoId: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId);
  if (!grupo) return { ok: false, error: 'El grupo no existe.' };
  if (grupo.estado !== 'cerrado') {
    return { ok: false, error: 'El grupo debe estar cerrado antes de renovar el ciclo.' };
  }
  if (!esPrincipalDe(grupo, opts.userId)) {
    return { ok: false, error: 'Solo el principal del grupo puede renovar el ciclo.' };
  }

  const fondoTotal = calcularFondoTotal(state.getMovimientosPorGrupo(grupo.id), grupo.id);

  const inicio = hoyISO();
  const cierre = unAnioDespues(inicio);
  const numeroCiclo = (Number(grupo.id.split('-')[1]) ?? 1) + 1;

  const nuevoGrupo = state.crearGrupo({
    nombre: `${grupo.nombre} · Ciclo ${numeroCiclo}`,
    fecha_inicio: inicio,
    fecha_cierre_pactada: cierre,
    tasa_interes_prestamo: grupo.tasa_interes_prestamo,
    porcentaje_mora: grupo.porcentaje_mora,
    principal_user_id: grupo.principal_user_id,
  });

  state.registrarMovimiento({
    grupo_id: nuevoGrupo.id,
    socio_id: null,
    tipo: 'renovacion',
    monto: fondoTotal,
    fecha: inicio,
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: `Renovación de ciclo. Fondo heredado del ciclo anterior: $${fondoTotal.toLocaleString('es-CO')}`,
    creado_por: opts.userId ?? '',
  });

  return { ok: true, data: nuevoGrupo };
}

// ──────────────────────────────────────────────
// Corrección de ledger (inmutabilidad: sin UPDATE/DELETE)
// ──────────────────────────────────────────────

export function registrarCorreccion(opts: {
  grupoId: string;
  corrigeMovimientoId: string;
  nota: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const original = state.getMovimientos().find((m) => m.id === opts.corrigeMovimientoId);
  if (!original || original.grupo_id !== grupo.id) {
    return { ok: false, error: 'El movimiento a corregir no existe en este grupo.' };
  }
  if (!opts.nota || opts.nota.trim().length < 3) {
    return { ok: false, error: 'Debe indicar el motivo de la corrección.' };
  }

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: original.socio_id,
    tipo: 'correccion',
    monto: 0,
    fecha: hoyISO(),
    comprobante_url: null,
    corrige_movimiento_id: original.id,
    nota: opts.nota.trim(),
    creado_por: opts.userId ?? '',
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Resumen financiero para el modal de cierre/renovación
// ──────────────────────────────────────────────

export function resumenCierre(grupoId: string) {
  const state = useMockStore.getState();
  const grupo = obtenerGrupo(grupoId);
  if (!grupo) return null;
  const movimientos = state.getMovimientosPorGrupo(grupo.id);
  const prestamosActivos = state
    .getPrestamos()
    .filter((p) => p.grupo_id === grupo.id && p.estado === 'activo')
    .reduce((sum, p) => sum + p.saldo_pendiente, 0);
  return {
    fondoTotal: calcularFondoTotal(movimientos, grupo.id),
    prestamosActivos,
    rendimientos: calcularRendimientosTotales(movimientos, grupo.id),
  };
}