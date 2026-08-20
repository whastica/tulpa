'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LoadingCard } from '@/components/loading-state';
import { useDashboardFinanciero, TablaSocios } from '@/features/dashboard';
import { ShieldX, FolderX } from 'lucide-react';

export default function GrupoSociosPage() {
  const params = useParams<{ grupoId: string }>();
  const { estado, metricas, nombreGrupo } = useDashboardFinanciero(params.grupoId);

  if (estado === 'cargando') {
    return (
      <div className="flex flex-col gap-6">
        <LoadingCard />
      </div>
    );
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
        description="No perteneces a este grupo, por lo que no puedes consultar su información."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fondo de ahorro"
        title="Estado de los socios"
        description={
          nombreGrupo
            ? `Consulta de solo lectura para los integrantes del grupo ${nombreGrupo}.`
            : 'Consulta de solo lectura para los integrantes del grupo.'
        }
      />

      {metricas ? (
        <TablaSocios filas={metricas.filas} />
      ) : (
        <LoadingCard />
      )}
    </div>
  );
}