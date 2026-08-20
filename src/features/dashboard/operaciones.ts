'use client';

import { useMockStore } from '@/mocks';
import type { Grupo, Prestamo } from '@/types';
import {
  calcularCapitalAportadoSocio,
  calcularFondoTotal,
  calcularLiquidez,
  calcularRendimientosTotales,
} from './metrics';
import { formatMoneda } from '@/lib/format';

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

function validarSocioActivoDeGrupo(
  grupoId: string,
  socioId: string
): ResultadoOperacion {
  const state = useMockStore.getState();
  const grupo = obtenerGrupo(grupoId);
  if (!grupo) return { ok: false, error: 'El grupo no existe.' };
  if (grupo.estado !== 'activo') return { ok: false, error: 'El grupo no está activo.' };
  const socio = state.getSocioPorId(socioId);
  if (!socio || socio.grupo_id !== grupo.id) {
    return { ok: false, error: 'El socio no pertenece al grupo.' };
  }
  if (socio.estado !== 'activo') {
    return { ok: false, error: 'El socio no está activo.' };
  }
  return { ok: true };
}

function limitesPrestamoSocio(grupoId: string, socioId: string): {
  fondoTotal: number;
  liquidez: number;
  montoMaximo: number;
  montoMaximoIndividual: number;
} {
  const state = useMockStore.getState();
  const movimientos = state.getMovimientosPorGrupo(grupoId);
  const prestamosActivos = state
    .getPrestamos()
    .filter((p) => p.grupo_id === grupoId && p.estado === 'activo')
    .reduce((sum, p) => sum + p.saldo_pendiente, 0);
  const fondoTotal = calcularFondoTotal(movimientos, grupoId);
  const liquidez = calcularLiquidez(fondoTotal, prestamosActivos);
  // Regla del tope del doble: el préstamo no puede superar 2x el ahorro (aportes) del socio.
  const montoMaximoIndividual =
    calcularCapitalAportadoSocio(state.getMovimientosPorSocio(socioId), socioId) * 2;
  const montoMaximo = Math.min(
    montoMaximoIndividual,
    Math.round(fondoTotal * 0.5),
    liquidez
  );
  return { fondoTotal, liquidez, montoMaximo, montoMaximoIndividual };
}

function hoyISO(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Timestamp local 'YYYY-MM-DD HH:mm' para la aceptación del reglamento. */
function ahoraLocal(): string {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  const h = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
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

  const limites = limitesPrestamoSocio(grupo.id, socio.id);
  const montoMaximoRegla50 = Math.round(limites.fondoTotal * 0.5);

  if (opts.monto > limites.montoMaximoIndividual) {
    return {
      ok: false,
      error: `El monto supera el tope del socio (máximo 2 veces su ahorro: $${limites.montoMaximoIndividual.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > montoMaximoRegla50) {
    return {
      ok: false,
      error: `El monto supera el límite permitido (máximo 50% del fondo: $${montoMaximoRegla50.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > limites.liquidez) {
    return {
      ok: false,
      error: `Liquidez insuficiente para el desembolso (disponible: $${limites.liquidez.toLocaleString('es-CO')}).`,
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
// Solicitud de Préstamo (iniciada por el Socio)
// ──────────────────────────────────────────────

export function solicitarPrestamoSocio(opts: {
  grupoId: string;
  socioId: string;
  monto: number;
  fecha: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarSocioActivoDeGrupo(opts.grupoId, opts.socioId);
  if (!base.ok) return base;
  if (!opts.monto || opts.monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a 0.' };
  }

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  const socio = state.getSocioPorId(opts.socioId)!;

  const limites = limitesPrestamoSocio(opts.grupoId, opts.socioId);
  const { liquidez, montoMaximoIndividual } = limites;
  const montoMaximoRegla50 = Math.round(limites.fondoTotal * 0.5);

  if (opts.monto > montoMaximoIndividual) {
    return {
      ok: false,
      error: `El monto supera el tope del socio (máximo 2 veces su ahorro: $${montoMaximoIndividual.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > montoMaximoRegla50) {
    return {
      ok: false,
      error: `El monto supera el límite permitido (máximo 50% del fondo: $${montoMaximoRegla50.toLocaleString('es-CO')}).`,
    };
  }
  if (opts.monto > liquidez) {
    return {
      ok: false,
      error: `Liquidez insuficiente para el desembolso (disponible: $${liquidez.toLocaleString('es-CO')}).`,
    };
  }

  const yaPendiente = state
    .getSolicitudesPorSocio(opts.socioId)
    .some((s) => s.grupo_id === opts.grupoId && s.estado === 'pendiente');
  if (yaPendiente) {
    return { ok: false, error: 'Ya tienes una solicitud de préstamo pendiente de aprobación.' };
  }

  const solicitud = state.crearSolicitudPrestamo({
    grupo_id: grupo.id,
    socio_id: socio.id,
    monto_solicitado: opts.monto,
    fecha_solicitud: opts.fecha,
    estado: 'pendiente',
    respuesta_nota: null,
  });

  state.crearNotificacion({
    grupo_id: grupo.id,
    tipo: 'solicitud_prestamo',
    para_rol: 'principal',
    socio_id: socio.id,
    titulo: 'Nueva solicitud de préstamo',
    mensaje: `${socio.nombre} solicita ${formatMoneda(opts.monto)}. Revisa la petición desde el panel del grupo.`,
    leida: false,
  });

  return { ok: true, data: { solicitudId: solicitud.id } };
}

// ──────────────────────────────────────────────
// Respuesta a Solicitud de Préstamo (Principal)
// ──────────────────────────────────────────────

export function responderSolicitudPrestamo(opts: {
  solicitudId: string;
  aprobada: boolean;
  nota?: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const state = useMockStore.getState();
  const solicitud = state.getSolicitudesPrestamo().find((s) => s.id === opts.solicitudId);
  if (!solicitud) return { ok: false, error: 'La solicitud no existe.' };

  const grupo = obtenerGrupo(solicitud.grupo_id);
  if (!grupo) return { ok: false, error: 'El grupo no existe.' };
  if (grupo.estado !== 'activo') return { ok: false, error: 'El grupo no está activo.' };
  if (!esPrincipalDe(grupo, opts.userId)) {
    return { ok: false, error: 'Solo el principal del grupo puede responder solicitudes.' };
  }
  if (solicitud.estado !== 'pendiente') {
    return { ok: false, error: 'La solicitud ya fue respondida.' };
  }

  const socio = state.getSocioPorId(solicitud.socio_id);
  if (!socio) return { ok: false, error: 'El socio no existe.' };

  if (opts.aprobada) {
    const resultado = registrarPrestamo({
      grupoId: grupo.id,
      socioId: socio.id,
      monto: solicitud.monto_solicitado,
      fecha: hoyISO(),
      userId: opts.userId,
    });
    if (!resultado.ok) return resultado;
  }

  state.actualizarSolicitudPrestamo(solicitud.id, {
    estado: opts.aprobada ? 'aprobada' : 'rechazada',
    respuesta_nota: opts.nota?.trim() ? opts.nota.trim() : null,
  });

  state.crearNotificacion({
    grupo_id: grupo.id,
    tipo: 'respuesta_solicitud',
    para_rol: 'socio',
    socio_id: socio.id,
    titulo: opts.aprobada ? 'Préstamo aprobado' : 'Solicitud rechazada',
    mensaje: opts.aprobada
      ? `Tu solicitud de ${formatMoneda(solicitud.monto_solicitado)} fue aprobada por el principal.`
      : `Tu solicitud de ${formatMoneda(solicitud.monto_solicitado)} fue rechazada${opts.nota?.trim() ? `: ${opts.nota.trim()}` : ''}.`,
    leida: false,
  });

  return { ok: true };
}

// ──────────────────────────────────────────────
// Pago de Préstamo (capital e interés separados)
// ──────────────────────────────────────────────

export function registrarPagoPrestamo(opts: {
  grupoId: string;
  prestamoId: string;
  montoCapital: number;
  montoInteres: number;
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

  const montoCapital = opts.montoCapital;
  const montoInteres = opts.montoInteres;

  if (montoCapital < 0 || montoInteres < 0) {
    return { ok: false, error: 'Los montos no pueden ser negativos.' };
  }
  if (montoCapital === 0 && montoInteres === 0) {
    return { ok: false, error: 'Debe indicar al menos un monto (capital o interés).' };
  }
  if (montoCapital > prestamo.saldo_pendiente) {
    return {
      ok: false,
      error: `El capital excede el saldo pendiente (${formatMoneda(prestamo.saldo_pendiente)}).`,
    };
  }

  const nuevoSaldo = Math.max(0, prestamo.saldo_pendiente - montoCapital);
  const estado: Prestamo['estado'] = nuevoSaldo <= 0 ? 'pagado' : 'activo';

  state.actualizarPrestamo(prestamo.id, { saldo_pendiente: nuevoSaldo, estado });

  if (montoCapital > 0) {
    state.registrarMovimiento({
      grupo_id: grupo.id,
      socio_id: prestamo.socio_id,
      tipo: 'pago_prestamo',
      monto: montoCapital,
      fecha: opts.fecha,
      comprobante_url: null,
      corrige_movimiento_id: null,
      nota: estado === 'pagado' ? 'Préstamo cancelado' : 'Abono a préstamo',
      creado_por: opts.userId ?? '',
    });
  }

  if (montoInteres > 0) {
    state.registrarMovimiento({
      grupo_id: grupo.id,
      socio_id: prestamo.socio_id,
      tipo: 'interes',
      monto: montoInteres,
      fecha: opts.fecha,
      comprobante_url: null,
      corrige_movimiento_id: null,
      nota: 'Interés del período por pago de préstamo',
      creado_por: opts.userId ?? '',
    });
  }

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

  // Regla de paz y salvo: el ahorro es colateral de los préstamos; un socio con
  // deuda activa no puede retirarse anticipadamente.
  const deudaActiva = state
    .getPrestamosPorSocio(socio.id)
    .some((p) => p.estado === 'activo' && p.saldo_pendiente > 0);
  if (deudaActiva) {
    return {
      ok: false,
      error:
        'El socio tiene un préstamo activo. Debe estar a paz y salvo para poder procesar su retiro.',
    };
  }

  const aporteTotal = calcularCapitalAportadoSocio(
    state.getMovimientosPorSocio(socio.id),
    socio.id
  );

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
// Aceptación del Reglamento del Fondo (gatekeeper de acceso)
// Solo el propio socio puede aceptar su reglamento.
// ──────────────────────────────────────────────

export function aceptarReglamento(opts: {
  socioId: string;
  userId: string | null | undefined;
}): ResultadoOperacion {
  const state = useMockStore.getState();
  const socio = state.getSocioPorId(opts.socioId);
  if (!socio) {
    return { ok: false, error: 'El socio no existe.' };
  }
  if (!opts.userId || socio.user_id !== opts.userId) {
    return { ok: false, error: 'Solo el socio puede aceptar su propio reglamento.' };
  }
  if (socio.aceptoTerminos) {
    return { ok: false, error: 'Ya aceptaste el reglamento del fondo.' };
  }

  state.actualizarSocio(opts.socioId, {
    aceptoTerminos: true,
    fechaAceptacionTerminos: ahoraLocal(),
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
// Extensión de ciclo (HU 8.1)
// Renueva solo la fecha de cierre pactada: conserva saldos, historial,
// rendimientos y membresía. Permite ajustar la cuota de cada socio activo,
// vigente desde la nueva fecha pactada.
// ──────────────────────────────────────────────

export function extenderCiclo(opts: {
  grupoId: string;
  nuevaFechaCierre: string;
  cuotas: { socioId: string; cuotaMensual: number }[];
  userId: string | null | undefined;
}): ResultadoOperacion {
  const base = validarPrincipal(opts.grupoId, opts.userId);
  if (!base.ok) return base;

  const state = useMockStore.getState();
  const grupo = obtenerGrupo(opts.grupoId)!;
  if (grupo.estado !== 'activo') {
    return { ok: false, error: 'El grupo no está activo.' };
  }
  if (!opts.nuevaFechaCierre || opts.nuevaFechaCierre <= grupo.fecha_cierre_pactada) {
    return { ok: false, error: 'La nueva fecha debe ser posterior a la fecha de cierre actual.' };
  }

  for (const c of opts.cuotas) {
    const socio = state.getSocioPorId(c.socioId);
    if (!socio || socio.grupo_id !== grupo.id) {
      return { ok: false, error: 'Uno de los socios no pertenece al grupo.' };
    }
    if (socio.estado !== 'activo') {
      return { ok: false, error: 'Solo los socios activos pueden ajustar su cuota.' };
    }
    if (!Number.isFinite(c.cuotaMensual) || c.cuotaMensual <= 0) {
      return { ok: false, error: 'La cuota debe ser mayor a 0.' };
    }
  }

  state.actualizarGrupo({ fecha_cierre_pactada: opts.nuevaFechaCierre });

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: null,
    tipo: 'renovacion',
    monto: 0,
    fecha: hoyISO(),
    comprobante_url: null,
    corrige_movimiento_id: null,
    nota: 'Extensión de ciclo pactada',
    creado_por: opts.userId ?? '',
  });

  for (const c of opts.cuotas) {
    const socio = state.getSocioPorId(c.socioId)!;
    if (socio.cuota_mensual_fija === c.cuotaMensual) continue;
    state.actualizarSocio(c.socioId, { cuota_mensual_fija: c.cuotaMensual });
    state.registrarMovimiento({
      grupo_id: grupo.id,
      socio_id: c.socioId,
      tipo: 'cambio_cuota',
      monto: 0,
      fecha: hoyISO(),
      comprobante_url: null,
      corrige_movimiento_id: null,
      nota: `Cuota actualizada de ${formatMoneda(socio.cuota_mensual_fija)} a ${formatMoneda(c.cuotaMensual)}. Vigente desde ${opts.nuevaFechaCierre}`,
      creado_por: opts.userId ?? '',
    });
  }

  return { ok: true };
}

// ──────────────────────────────────────────────
// Corrección de ledger (inmutabilidad: sin UPDATE/DELETE)
// ──────────────────────────────────────────────

export function registrarCorreccion(opts: {
  grupoId: string;
  corrigeMovimientoId: string;
  montoCorregido: number;
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
  if (opts.montoCorregido < 0) {
    return { ok: false, error: 'El monto corregido no puede ser negativo.' };
  }

  state.registrarMovimiento({
    grupo_id: grupo.id,
    socio_id: original.socio_id,
    tipo: 'correccion',
    monto: opts.montoCorregido,
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