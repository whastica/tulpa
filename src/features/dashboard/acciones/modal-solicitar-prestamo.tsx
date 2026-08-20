'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useMockStore } from '@/mocks';
import { useSession } from '@/features/auth';
import { useLimitesPrestamo } from '@/features/prestamos/use-limites-prestamo';
import { registrarPrestamo } from '../operaciones';
import { formatMoneda, valorNumeroFinito } from '@/lib/format';
import { CreditCard, TriangleAlert, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const prestamoSchema = z.object({
  socioId: z.string().min(1, 'Selecciona un socio'),
  monto: z
    .number({ error: 'Debe ser un número válido' })
    .positive('Debe ser mayor a 0')
    .int('Debe ser un número entero'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
});

type PrestamoFormData = z.infer<typeof prestamoSchema>;

function hoyISO(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function ModalSolicitarPrestamo({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const { liquidez, montoMaximo, tasa } = useLimitesPrestamo(grupo?.id ?? '');

  const socios = useMemo(() => {
    if (!grupo) return [];
    return getSociosPorGrupo(grupo.id).filter((s) => s.estado === 'activo');
  }, [grupo, getSociosPorGrupo]);

  const form = useForm<PrestamoFormData>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: { socioId: '', monto: 0, fecha: hoyISO() },
  });

  const monto = form.watch('monto') || 0;
  const interesEstimado = Math.round(monto * tasa);
  const totalDevolver = monto + interesEstimado;

  const excedeLimite = monto > montoMaximo;
  const excedeLiquidez = monto > liquidez;
  const invalido = excedeLimite || excedeLiquidez;
  const hayMonto = monto > 0;

  async function onSubmit(data: PrestamoFormData) {
    if (!grupo) return;
    if (invalido) return;
    const resultado = registrarPrestamo({
      grupoId: grupo.id,
      socioId: data.socioId,
      monto: data.monto,
      fecha: data.fecha,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success('Préstamo registrado');
      form.reset();
      onOpenChange(false);
    } else {
      toast.error(resultado.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar préstamo</DialogTitle>
          <DialogDescription>
            Registra un préstamo para un socio. Máximo 50% del fondo y limitado por la
            liquidez disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Límite Regla 50%</span>
            <span className="font-mono font-medium text-foreground">
              {formatMoneda(montoMaximo)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Liquidez Disponible</span>
            <span className="font-mono font-medium text-foreground">
              {formatMoneda(liquidez)}
            </span>
          </div>
          {hayMonto && (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Interés a Generar</span>
                <span className="font-mono font-medium text-foreground">
                  {formatMoneda(interesEstimado)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Total a Devolver</span>
                <span className="font-mono font-medium text-foreground">
                  {formatMoneda(totalDevolver)}
                </span>
              </div>
            </>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="socioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Socio prestatario</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? '')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un socio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {socios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto solicitado ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(valorNumeroFinito(e.target.valueAsNumber))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {hayMonto && invalido && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  El monto solicitado excede el límite del 50% del fondo o la liquidez actual
                  disponible.
                </AlertDescription>
              </Alert>
            )}

            {hayMonto && !invalido && (
              <Alert>
                <Info className="size-4" aria-hidden="true" />
                <AlertDescription>
                  Interés aplicado: {(tasa * 100).toFixed(1)}% mensual ({formatMoneda(interesEstimado)} el
                  primer período). Total a devolver: {formatMoneda(totalDevolver)}.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button type="submit" disabled={invalido} className="gap-1.5">
                <CreditCard className="size-4" aria-hidden="true" />
                Registrar préstamo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}