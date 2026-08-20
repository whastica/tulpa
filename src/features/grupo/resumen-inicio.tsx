'use client';

import { useRouter } from 'next/navigation';
import type { Grupo } from '@/types';
import { useMockStore } from '@/mocks';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatFecha, formatMoneda, formatPorcentaje } from '@/lib/format';
import { ArrowLeft, CheckCircle, Calendar, Percent } from 'lucide-react';

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

type SocioConfig = {
  nombre: string;
  cuota_mensual: number;
};

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function ResumenInicio({
  grupo,
  socios,
  onVolver,
}: {
  grupo: Grupo;
  socios: SocioConfig[];
  onVolver: () => void;
}) {
  const router = useRouter();
  const registrarSocios = useMockStore((s) => s.registrarSocios);

  const cuotaTotal = socios.reduce((sum, s) => sum + s.cuota_mensual, 0);

  function handleIniciarGrupo() {
    const sociosParaGuardar = socios.map((s, index) => ({
      grupo_id: grupo.id,
      user_id: `user-${String(index + 1).padStart(3, '0')}`,
      nombre: s.nombre,
      cuota_mensual_fija: s.cuota_mensual,
      estado: 'activo' as const,
      fecha_ingreso: grupo.fecha_inicio,
      fecha_retiro: null,
      aceptoTerminos: false,
      fechaAceptacionTerminos: null,
    }));

    registrarSocios(sociosParaGuardar);
    router.push('/dashboard');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
          <CheckCircle className="size-5 text-success" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Resumen antes de iniciar
          </h2>
          <p className="text-sm text-muted-foreground">
            Revisa la configuración antes de confirmar.
          </p>
        </div>
      </div>

      {/* Información del grupo */}
      <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
          Configuración del grupo
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Nombre</span>
            <span className="text-sm font-medium text-foreground">{grupo.nombre}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Fecha de inicio</span>
            <span className="text-sm font-medium text-foreground">
              {formatFecha(grupo.fecha_inicio)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Fecha de cierre</span>
            <span className="text-sm font-medium text-foreground">
              {formatFecha(grupo.fecha_cierre_pactada)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-6 pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="size-3" aria-hidden="true" /> Interés
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatPorcentaje(grupo.tasa_interes_prestamo)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="size-3" aria-hidden="true" /> Mora
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatPorcentaje(grupo.porcentaje_mora)}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de socios — Desktop table */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Socios ({socios.length})
        </h3>
        <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nombre
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cuota mensual
                </th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio, index) => (
                <tr key={index} className="border-t border-border transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{socio.nombre}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">
                    {formatMoneda(socio.cuota_mensual)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/40">
                <td colSpan={2} className="px-4 py-2.5 font-semibold text-foreground">
                  Cuota total del grupo
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-foreground">
                  {formatMoneda(cuotaTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile list */}
        <div className="flex flex-col gap-2 sm:hidden">
          {socios.map((socio, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{socio.nombre}</span>
              </div>
              <span className="font-mono text-sm tabular-nums font-medium text-foreground">
                {formatMoneda(socio.cuota_mensual)}
              </span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <span className="text-sm font-semibold text-foreground">Cuota total del grupo</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatMoneda(cuotaTotal)}
            </span>
          </div>
        </div>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Al iniciar el grupo, la membresía y las cuotas quedarán fijas y no podrán
          modificarse durante el ciclo.
        </AlertDescription>
      </Alert>

      {/* Botones */}
      <div className="flex flex-col justify-between gap-3 border-t border-border pt-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onVolver} className="gap-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a editar
        </Button>
        <Button type="button" size="lg" onClick={handleIniciarGrupo} className="gap-2">
          <CheckCircle className="size-4" aria-hidden="true" />
          Iniciar grupo
        </Button>
      </div>
    </div>
  );
}
