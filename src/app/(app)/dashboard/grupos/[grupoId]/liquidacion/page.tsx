'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LoadingCard } from '@/components/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import {
  useDashboardFinanciero,
  TablaResumenLiquidacion,
  calcularLiquidacion,
} from '@/features/dashboard';
import { cerrarCiclo } from '@/features/dashboard/operaciones';
import { FolderX, Lock, FileDown, AlertTriangle } from 'lucide-react';

export default function GrupoLiquidacionPage() {
  const params = useParams<{ grupoId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { estado, grupo, esPrincipal, nombreGrupo } = useDashboardFinanciero(params.grupoId);
  const socios = useMockStore((s) => s.socios);
  const movimientos = useMockStore((s) => s.movimientos);
  const [confirmando, setConfirmando] = useState(false);

  const resumen = useMemo(
    () => (grupo ? calcularLiquidacion({ grupo, socios, movimientos }) : null),
    [grupo, socios, movimientos]
  );

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

  const cerrado = grupo?.estado === 'cerrado';

  async function handleConfirmar() {
    if (!grupo) return;
    setConfirmando(true);
    const resultado = cerrarCiclo({ grupoId: grupo.id, userId: session?.userId });
    if (!resultado.ok) {
      toast.error(resultado.error);
      setConfirmando(false);
      return;
    }
    toast.success('Liquidación confirmada. El ciclo quedó cerrado.');
    setConfirmando(false);
    router.refresh();
  }

  function handleExportar() {
    toast.info('La exportación a PDF/Excel se integrará en la integración con el backend.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fondo de ahorro"
        title="Liquidación final"
        description={
          nombreGrupo
            ? cerrado
              ? `${nombreGrupo} cerró su ciclo. Reparto final de rendimientos por socio activo.`
              : `Simulación del reparto proporcional de rendimientos al cierre del ciclo de ${nombreGrupo}.`
            : 'Reparto proporcional de rendimientos al cierre del ciclo.'
        }
      />

      {grupo && resumen && (
        <TablaResumenLiquidacion
          grupo={grupo}
          socios={socios}
          movimientos={movimientos}
        />
      )}

      {cerrado ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <Alert className="flex-1">
            <Lock className="size-4" aria-hidden="true" />
            <AlertTitle>Grupo cerrado</AlertTitle>
            <AlertDescription>
              El ciclo finalizó y el reparto quedó registrado en el ledger del grupo.
            </AlertDescription>
          </Alert>
          <Button variant="outline" className="gap-1.5" onClick={handleExportar}>
            <FileDown className="size-4" aria-hidden="true" />
            Exportar PDF / Excel
          </Button>
        </div>
      ) : esPrincipal ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>Acción irreversible</AlertTitle>
            <AlertDescription>
              Al confirmar, el grupo pasa al estado Cerrado y no se podrán registrar más
              aportes, préstamos ni pagos.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={handleConfirmar}
              disabled={confirmando}
            >
              <Lock className="size-4" aria-hidden="true" />
              Confirmar Liquidación Final
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Solo el principal del grupo puede confirmar la liquidación final. Esta vista es
            de solo lectura para los socios.
          </p>
        </div>
      )}
    </div>
  );
}