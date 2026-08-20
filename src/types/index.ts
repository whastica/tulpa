// ──────────────────────────────────────────────
// Common types
// ──────────────────────────────────────────────

/** ISO 8601 date string (YYYY-MM-DD) */
type ISODateString = string;

/** ISO 8601 datetime string with time component */
type ISODateTimeString = string;

// ──────────────────────────────────────────────
// Restricted union types
// ──────────────────────────────────────────────

type GrupoEstado = 'activo' | 'cerrado' | 'renovado';

type SocioEstado = 'activo' | 'retirado_anticipado';

type PrestamoEstado = 'activo' | 'pagado';

type MovimientoTipo =
  | 'aporte'
  | 'mora'
  | 'prestamo'
  | 'pago_prestamo'
  | 'interes'
  | 'correccion'
  | 'retiro_anticipado'
  | 'renovacion'
  | 'cierre_liquidacion'
  | 'cambio_cuota';

// ──────────────────────────────────────────────
// Entity types
// ──────────────────────────────────────────────

type Grupo = {
  id: string;
  /** Código de invitación único (ticket de acceso al grupo). */
  codigo: string;
  nombre: string;
  fecha_inicio: ISODateString;
  fecha_cierre_pactada: ISODateString;
  estado: GrupoEstado;
  tasa_interes_prestamo: number;
  porcentaje_mora: number;
  principal_user_id: string;
};

type Socio = {
  id: string;
  grupo_id: string;
  user_id: string;
  nombre: string;
  cuota_mensual_fija: number;
  estado: SocioEstado;
  fecha_ingreso: ISODateString;
  fecha_retiro: ISODateString | null;
  /** Aceptación del Reglamento del Fondo (gatekeeper de acceso al Dashboard). */
  aceptoTerminos: boolean;
  /** Timestamp local 'YYYY-MM-DD HH:mm' de la aceptación del reglamento. */
  fechaAceptacionTerminos: string | null;
};

type MovimientoLedger = {
  id: string;
  grupo_id: string;
  socio_id: string | null;
  tipo: MovimientoTipo;
  monto: number;
  fecha: ISODateString;
  comprobante_url: string | null;
  corrige_movimiento_id: string | null;
  nota: string | null;
  creado_por: string;
  creado_en: ISODateTimeString;
};

type Prestamo = {
  id: string;
  grupo_id: string;
  socio_id: string;
  monto_solicitado: number;
  tasa_aplicada: number;
  fecha_solicitud: ISODateString;
  estado: PrestamoEstado;
  saldo_pendiente: number;
};

type SolicitudPrestamoEstado = 'pendiente' | 'aprobada' | 'rechazada';

/** Petición de préstamo hecha por un socio; requiere aprobación del principal. */
type SolicitudPrestamo = {
  id: string;
  grupo_id: string;
  socio_id: string;
  monto_solicitado: number;
  fecha_solicitud: ISODateString;
  estado: SolicitudPrestamoEstado;
  respuesta_nota: string | null;
};

type NotificacionTipo = 'solicitud_prestamo' | 'respuesta_solicitud';

type NotificacionRol = 'principal' | 'socio';

/** Notificación interna del grupo (mock por ahora; swap a backend en la HU de notificaciones). */
type Notificacion = {
  id: string;
  grupo_id: string;
  tipo: NotificacionTipo;
  para_rol: NotificacionRol;
  socio_id: string | null;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creado_en: ISODateTimeString;
};

// ──────────────────────────────────────────────
// Auth types
// ──────────────────────────────────────────────

type RolUsuario = 'principal' | 'socio';

type Sesion = {
  userId: string;
  rol: RolUsuario;
  socioId: string | null;
};

export type {
  ISODateString,
  ISODateTimeString,
  GrupoEstado,
  SocioEstado,
  PrestamoEstado,
  MovimientoTipo,
  Grupo,
  Socio,
  MovimientoLedger,
  Prestamo,
  SolicitudPrestamo,
  SolicitudPrestamoEstado,
  Notificacion,
  NotificacionTipo,
  NotificacionRol,
  RolUsuario,
  Sesion,
};
