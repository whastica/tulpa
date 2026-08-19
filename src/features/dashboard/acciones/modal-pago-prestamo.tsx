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
import { registrarPagoPrestamo } from '../operaciones';
import { formatMoneda } from '@/lib/format';
import { CreditCard, TriangleAlert, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const pagoSchema = z.object({
  prestamoId: z.string().min(1, 'Selecciona un préstamo'),
  monto: z
    .number({ error: 'Debe ser un número válido' })
    .positive('Debe ser mayor a 0')
    .int('Debe ser un número entero'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
});

type PagoFormData = z.infer<typeof pagoSchema>;

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

export function ModalPagoPrestamo({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const prestamos = useMockStore((s) => s.prestamos);
  const socios = useMockStore((s) => s.socios);

  const prestamosActivos = useMemo(() => {
    if (!grupo) return [];
    return prestamos.filter((p) => p.grupo_id === grupo.id && p.estado === 'activo');
  }, [grupo, prestamos]);

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: { prestamoId: '', monto: 0, fecha: hoyISO() },
  });

  const prestamoId = form.watch('prestamoId');
  const monto = form.watch('monto') || 0;

  const prestamoSeleccionado = useMemo(
    () => prestamosActivos.find((p) => p.id === prestamoId) ?? null,
    [prestamosActivos, prestamoId]
  );

  const tasa = grupo?.tasa_interes_prestamo ?? 0;
  const saldoPendiente = prestamoSeleccionado?.saldo_pendiente ?? 0;
  const interes = Math.round(saldoPendiente * tasa);
  const montoMaximo = saldoPendiente + interes;

  const cubre = monto >= interes && monto > 0;
  const noExcede = monto <= montoMaximo;
  const amortizaCapital = cubre ? monto - interes : 0;
  const nuevoSaldo = cubre ? Math.max(0, saldoPendiente - amortizaCapital) : saldoPendiente;
  const invalido = !cubre || !noExcede || !prestamoSeleccionado;

  async function onSubmit(data: PagoFormData) {
    if (!grupo || invalido) return;
    const resultado = registrarPagoPrestamo({
      grupoId: grupo.id,
      prestamoId: data.prestamoId,
      monto: data.monto,
      fecha: data.fecha,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success('Pago registrado');
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
          <DialogTitle>Registrar pago de préstamo</DialogTitle>
          <DialogDescription>
            El abono primero cubre el interés del período y el excedente amortiza el capital.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="prestamoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Préstamo activo</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? '')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un préstamo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {prestamosActivos.map((p) => {
                        const socio = socios.find((s) => s.id === p.socio_id);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {socio?.nombre ?? 'Desconocido'} · {formatMoneda(p.saldo_pendiente)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {prestamoSeleccionado && (
              <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Saldo</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoneda(saldoPendiente)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Interés</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoneda(interes)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Nuevo saldo</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoneda(nuevoSaldo)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto a pagar ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1000"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
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

            {prestamoSeleccionado && monto > 0 && !cubre && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  El abono mínimo es {formatMoneda(interes)} para cubrir el interés del período.
                </AlertDescription>
              </Alert>
            )}

            {cubre && !noExcede && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  El monto máximo es {formatMoneda(montoMaximo)} (saldo + interés). El excedente se devolverá al prestatario.
                </AlertDescription>
              </Alert>
            )}

            {cubre && noExcede && (
              <Alert>
                <Info className="size-4" aria-hidden="true" />
                <AlertDescription>
                  {amortizaCapital > 0
                    ? `Abono: ${formatMoneda(interes)} de interés + ${formatMoneda(amortizaCapital)} de capital.`
                    : `Abono cubre solo el interés (${formatMoneda(interes)}). El saldo permanece igual.`}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button type="submit" disabled={invalido} className="gap-1.5">
                <CreditCard className="size-4" aria-hidden="true" />
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}