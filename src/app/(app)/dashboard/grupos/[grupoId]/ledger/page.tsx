'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LoadingCard } from '@/components/loading-state';
import { useDashboardFinanciero, SeccionMovimientos } from '@/features/dashboard';
import { FolderX } from 'lucide-react';

export default function GrupoLedgerPage() {
  const params = useParams<{ grupoId: string }>();
  const { estado, esPrincipal, nombreGrupo } = useDashboardFinanciero(params.grupoId);

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fondo de ahorro"
        title="Ledger del grupo"
        description={
          nombreGrupo
            ? `Libro de movimientos del grupo ${nombreGrupo}. Solo el principal puede corregir registros.`
            : 'Libro de movimientos del grupo.'
        }
      />

      <SeccionMovimientos grupoId={params.grupoId} esAdministrador={esPrincipal} />
    </div>
  );
}