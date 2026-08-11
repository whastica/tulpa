'use client';

import { useSession } from '@/features/auth';
import {
  CrearGrupoForm,
  GrupoInfo,
  ConfigurarSociosForm,
  SociosInfo,
} from '@/features/grupo';
import { useMockStore } from '@/mocks';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { formatMoneda } from '@/lib/format';
import {
  Users,
  Settings,
  Wallet,
  HandCoins,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

function useDashboardMetrics() {
  const grupo = useMockStore((s) => s.grupo);
  const socios = useMockStore((s) => s.socios);
  const movimientos = useMockStore((s) => s.movimientos);
  const prestamos = useMockStore((s) => s.prestamos);

  const sociosActivos = socios.filter((s) => s.estado === 'activo');

  const sumaPorTipo = (tipo: string) =>
    movimientos
      .filter((m) => m.grupo_id === grupo?.id && m.tipo === tipo)
      .reduce((sum, m) => sum + m.monto, 0);

  const aportes = sumaPorTipo('aporte');
  const retiros = sumaPorTipo('retiro_anticipado');
  const desembolsos = sumaPorTipo('prestamo');
  const pagosPrestamo = sumaPorTipo('pago_prestamo');

  const fondoDisponible = aportes - retiros - desembolsos + pagosPrestamo;

  const prestamosActivos = prestamos.filter(
    (p) => p.grupo_id === grupo?.id && p.estado === 'activo'
  );
  const saldoPendiente = prestamosActivos.reduce(
    (sum, p) => sum + p.saldo_pendiente,
    0
  );
  const cuotaMensualTotal = sociosActivos.reduce(
    (sum, s) => sum + s.cuota_mensual_fija,
    0
  );

  return {
    fondoDisponible,
    cuotaMensualTotal,
    sociosActivos: sociosActivos.length,
    prestamosActivos: prestamosActivos.length,
    saldoPendiente,
    mora: sumaPorTipo('mora'),
  };
}

export default function DashboardPage() {
  const { isPrincipal, socio } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const metrics = useDashboardMetrics();

  const socios = grupo ? getSociosPorGrupo(grupo.id) : [];
  const haySocios = socios.length > 0;

  const statGrid = (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Fondo disponible"
        value={formatMoneda(metrics.fondoDisponible)}
        icon={<Wallet className="size-4" />}
        accent="primary"
        description="Efectivo actual del fondo"
      />
      <StatCard
        label="Socios activos"
        value={metrics.sociosActivos}
        icon={<Users className="size-4" />}
        accent="info"
        description={`${socios.length} integrantes en total`}
      />
      <StatCard
        label="Cuota mensual total"
        value={formatMoneda(metrics.cuotaMensualTotal)}
        icon={<HandCoins className="size-4" />}
        accent="success"
        description="Ahorro mensual combinado"
      />
      <StatCard
        label="Préstamos activos"
        value={metrics.prestamosActivos}
        icon={<CreditCard className="size-4" />}
        accent="warning"
        description={`Saldo pendiente ${formatMoneda(metrics.saldoPendiente)}`}
      />
    </div>
  );

  // ── Socio ──
  if (!isPrincipal) {
    if (!grupo) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            eyebrow="Fondo de ahorro"
            title="Dashboard"
            description={`Bienvenido, ${socio?.nombre ?? socio?.id ?? ''}`}
          />
          <EmptyState
            icon={<Users className="size-10" />}
            title="Aún no se ha creado el grupo"
            description="Espera a que el principal configure el fondo de ahorro comunal."
          />
        </div>
      );
    }

    if (!haySocios) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            eyebrow="Fondo de ahorro"
            title="Dashboard"
            description={`Bienvenido, ${socio?.nombre ?? socio?.id ?? ''}`}
          />
          <GrupoInfo grupo={grupo} />
          <EmptyState
            icon={<Settings className="size-10" />}
            title="Configuración en progreso"
            description="El principal está configurando los socios del grupo. Espera a que finalice."
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={grupo.nombre}
          title="Bienvenido"
          description={`Resumen del fondo comunal, ${socio?.nombre ?? socio?.id ?? ''}`}
        />
        {statGrid}
        <GrupoInfo grupo={grupo} />
        <SociosInfo socios={socios} />
      </div>
    );
  }

  // ── Principal ──
  if (!grupo) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Configuración"
          title="Crear nuevo grupo"
          description="Configura las reglas iniciales de tu fondo de ahorro comunal."
        />
        <CrearGrupoForm />
      </div>
    );
  }

  if (!haySocios) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={grupo.nombre}
          title="Configurar socios"
          description="Define la membresía y las cuotas de cada integrante del grupo."
        />
        <GrupoInfo grupo={grupo} />
        <ConfigurarSociosForm grupo={grupo} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={grupo.nombre}
        title="Panel de administración"
        description="Resumen financiero y de operación del fondo de ahorro."
        actions={
          metrics.mora > 0 ? (
            <div
              className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-destructive"
              role="status"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Mora acumulada: {formatMoneda(metrics.mora)}
            </div>
          ) : undefined
        }
      />
      {statGrid}
      <GrupoInfo grupo={grupo} />
      <SociosInfo socios={socios} />
    </div>
  );
}