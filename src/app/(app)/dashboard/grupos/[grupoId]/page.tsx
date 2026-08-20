'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LoadingCard } from '@/components/loading-state';
import {
  useDashboardFinanciero,
  ResumenTarjetas,
  GraficoEvolucion,
  EstadoConexion,
  BarraAcciones,
  TarjetaInvitacion,
  SeccionSolicitudesPrestamo,
} from '@/features/dashboard';
import { ShieldX, FolderX } from 'lucide-react';

function EsqueletoCarga() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
      <LoadingCard />
      <LoadingCard />
    </div>
  );
}

export default function GrupoDashboardPage() {
  const params = useParams<{ grupoId: string }>();
  const grupoId = params.grupoId;
  const { estado, metricas, realtimeEstado, nombreGrupo, esPrincipal, grupo } = useDashboardFinanciero(grupoId);

  if (estado === 'cargando') {
    return <EsqueletoCarga />;
  }

  if (estado === 'no_encontrado') {
    return (
      <ErrorState
        icon={<FolderX className="size-10" aria-hidden="true" />}
        title="Grupo no encontrado"
        description="El grupo que buscas no existe o no está disponible todavía."
      />
    );
  }

  if (estado === 'no_autorizado') {
    return (
      <ErrorState
        icon={<ShieldX className="size-10" aria-hidden="true" />}
        title="Acceso restringido"
        description="No perteneces a este grupo, por lo que no puedes consultar su información financiera."
      />
    );
  }

  const sinMovimientos = metricas ? metricas.serie.length === 0 : false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fondo de ahorro"
        title="Dashboard financiero"
        description={
          nombreGrupo
            ? `Estado en tiempo real del grupo ${nombreGrupo}.`
            : 'Estado financiero del grupo en tiempo real.'
        }
        actions={<EstadoConexion estado={realtimeEstado} />}
      />

      {esPrincipal && grupo && (
        <TarjetaInvitacion grupo={grupo} />
      )}

      {esPrincipal && grupo && (
        <BarraAcciones
          grupo={grupo}
          liquidez={metricas?.liquidez ?? 0}
        />
      )}

      {grupo && (
        <SeccionSolicitudesPrestamo grupo={grupo} />
      )}

      {metricas ? (
        <>
          <ResumenTarjetas
            fondoTotal={metricas.fondoTotal}
            liquidez={metricas.liquidez}
            prestamosActivos={metricas.prestamosActivos}
            rendimientos={metricas.rendimientos}
          />

          <GraficoEvolucion serie={metricas.serie} />

          {sinMovimientos && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Aún no hay movimientos registrados para este grupo.
            </p>
          )}
        </>
      ) : (
        <EsqueletoCarga />
      )}
    </div>
  );
}