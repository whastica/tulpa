'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { extenderCiclo } from '../operaciones';
import { formatFecha, formatMoneda, valorNumeroFinito } from '@/lib/format';
import {
  RefreshCw,
  Lock,
  AlertTriangle,
  CalendarDays,
  Info,
  UsersRound,
  ChevronLeft,
} from 'lucide-react';
import type { Grupo } from '@/types';

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

type Modo = 'renovar' | 'cerrar';

type RenovarFormData = {
  nuevaFechaCierre: string;
};

// ──────────────────────────────────────────────
// Componente (HU 8.1: extensión de ciclo + ajuste de cuotas)
// ──────────────────────────────────────────────

export function ModalCierreORenovacion({
  open,
  onOpenChange,
  grupo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: Grupo | null;
}) {
  const router = useRouter();
  const { session } = useSession();
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const [modo, setModo] = useState<Modo | null>(null);
  const [cuotas, setCuotas] = useState<Record<string, number>>({});

  const esActivo = grupo?.estado === 'activo';

  const socios = useMemo(() => {
    if (!grupo) return [];
    return getSociosPorGrupo(grupo.id).filter((s) => s.estado === 'activo');
  }, [grupo, getSociosPorGrupo]);

  function cuotaDe(socioId: string, porDefecto: number): number {
    const v = cuotas[socioId];
    return Number.isFinite(v) ? (v as number) : porDefecto;
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setModo(null);
      setCuotas({});
    }
    onOpenChange(next);
  }

  const renovarSchema = useMemo(
    () =>
      z.object({
        nuevaFechaCierre: z
          .string()
          .min(1, 'Selecciona la nueva fecha de cierre')
          .refine(
            (v) => (grupo ? v > grupo.fecha_cierre_pactada : true),
            'La nueva fecha debe ser posterior a la fecha de cierre actual.'
          ),
      }),
    [grupo]
  );

  const form = useForm<RenovarFormData>({
    resolver: zodResolver(renovarSchema),
    defaultValues: { nuevaFechaCierre: '' },
  });

  const hayCuotaInvalida = socios.some((s) => cuotaDe(s.id, s.cuota_mensual_fija) <= 0);

  async function handleRenovar(data: RenovarFormData) {
    if (!grupo || hayCuotaInvalida) return;
    const resultado = extenderCiclo({
      grupoId: grupo.id,
      nuevaFechaCierre: data.nuevaFechaCierre,
      cuotas: socios.map((s) => ({
        socioId: s.id,
        cuotaMensual: cuotaDe(s.id, s.cuota_mensual_fija),
      })),
      userId: session?.userId,
    });
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Ciclo renovado');
    form.reset();
    onOpenChange(false);
  }

  async function handleIrLiquidacion() {
    if (!grupo) return;
    onOpenChange(false);
    router.push(`/dashboard/grupos/${grupo.id}/liquidacion`);
  }

  if (!grupo) return null;

  const titulo =
    modo === 'renovar'
      ? 'Renovar ciclo'
      : modo === 'cerrar'
        ? 'Cierre de ciclo'
        : 'Cierre / Renovación';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {modo === 'renovar'
              ? 'Extiende la fecha de cierre pactada y ajusta cuotas para continuar el ciclo.'
              : modo === 'cerrar'
                ? 'Se reparte el fondo y finaliza el ciclo. No se puede deshacer.'
                : 'Decide si el grupo continúa ahorrando o liquida el fondo.'}
          </DialogDescription>
        </DialogHeader>

        {!esActivo ? (
          <>
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertDescription>
                El grupo está cerrado y no tiene renovaciones ni cierres pendientes. Para continuar,
                inicia un nuevo grupo.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cerrar</Button>} />
            </DialogFooter>
          </>
        ) : modo === null ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1.5 p-4 text-left"
              onClick={() => setModo('renovar')}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <RefreshCw className="size-4" aria-hidden="true" />
                Renovar Ciclo
              </span>
              <span className="text-xs text-muted-foreground">
                Extiende la fecha de cierre sin reiniciar saldos, historial ni membresía.
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1.5 p-4 text-left"
              onClick={() => setModo('cerrar')}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="size-4" aria-hidden="true" />
                Cerrar y liquidar
              </span>
              <span className="text-xs text-muted-foreground">
                Reparte el fondo total entre los socios y finaliza el ciclo.
              </span>
            </Button>
          </div>
        ) : modo === 'renovar' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRenovar)} className="flex flex-col gap-4">
              <Alert>
                <Info className="size-4" aria-hidden="true" />
                <AlertDescription>
                  La renovación extiende el plazo pactado sin reiniciar saldos, historial ni
                  membresía. Los rendimientos acumulados se conservan.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Fecha de cierre actual</span>
                  <span className="font-medium text-foreground">
                    {formatFecha(grupo.fecha_cierre_pactada)}
                  </span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="nuevaFechaCierre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva fecha de cierre</FormLabel>
                    <FormControl>
                      <Input type="date" min={grupo.fecha_cierre_pactada} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UsersRound className="size-4 text-muted-foreground" aria-hidden="true" />
                  Cuotas mensuales (vigentes desde la nueva fecha)
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                  {socios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-0"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {s.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Actual: {formatMoneda(s.cuota_mensual_fija)}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={cuotaDe(s.id, s.cuota_mensual_fija)}
                        onChange={(e) =>
                          setCuotas((prev) => ({
                            ...prev,
                            [s.id]: valorNumeroFinito(e.target.valueAsNumber),
                          }))
                        }
                        className="w-32 text-right"
                        aria-label={`Cuota mensual de ${s.nombre}`}
                      />
                    </div>
                  ))}
                </div>
                {hayCuotaInvalida && (
                  <p className="text-xs text-destructive">
                    La cuota de cada socio debe ser mayor a 0.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-1"
                  onClick={() => setModo(null)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Volver
                </Button>
                <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
                <Button type="submit" disabled={hayCuotaInvalida} className="gap-1.5">
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Renovar ciclo
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>Acción irreversible</AlertTitle>
              <AlertDescription>
                Al cerrar el ciclo no se podrán registrar más aportes, préstamos ni pagos.
                El reparto del fondo solo puede hacerse una vez.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="ghost" className="gap-1" onClick={() => setModo(null)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Volver
              </Button>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button onClick={handleIrLiquidacion} className="gap-1.5">
                <Lock className="size-4" aria-hidden="true" />
                Ver liquidación detallada
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}