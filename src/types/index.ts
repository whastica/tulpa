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
  | 'cierre_liquidacion';

// ──────────────────────────────────────────────
// Entity types
// ──────────────────────────────────────────────

type Grupo = {
  id: string;
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
  RolUsuario,
  Sesion,
};
