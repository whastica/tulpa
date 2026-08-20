'use client';

import { useMemo, useState } from 'react';
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
import { TablaPrestamosActivos } from '@/features/prestamos/tabla-prestamos-activos';
import { registrarPagoPrestamo } from '../operaciones';
import { formatMoneda, valorNumeroFinito } from '@/lib/format';
import { CreditCard, TriangleAlert, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const pagoSchema = z.object({
  socioId: z.string().min(1, 'Selecciona un socio'),
  prestamoId: z.string().min(1, 'Selecciona un préstamo'),
  montoCapital: z
    .number({ error: 'Debe ser un número válido' })
    .min(0, 'No puede ser negativo'),
  montoInteres: z
    .number({ error: 'Debe ser un número válido' })
    .min(0, 'No puede ser negativo'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
}).refine((data) => data.montoCapital > 0 || data.montoInteres > 0, {
  message: 'Debe indicar al menos un monto (capital o interés).',
  path: ['montoCapital'],
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

  const [socioSeleccionado, setSocioSeleccionado] = useState<string>('');
  const [prestamoSeleccionadoId, setPrestamoSeleccionadoId] = useState<string>('');

  const sociosConPrestamos = useMemo(() => {
    if (!grupo) return [];
    const sociosIds = new Set(
      prestamos
        .filter((p) => p.grupo_id === grupo.id && p.estado === 'activo')
        .map((p) => p.socio_id)
    );
    return socios.filter((s) => sociosIds.has(s.id));
  }, [grupo, prestamos, socios]);

  const prestamosActivosSocio = useMemo(() => {
    if (!grupo || !socioSeleccionado) return [];
    return prestamos.filter(
      (p) =>
        p.grupo_id === grupo.id &&
        p.socio_id === socioSeleccionado &&
        p.estado === 'activo'
    );
  }, [grupo, prestamos, socioSeleccionado]);

  const tasa = grupo?.tasa_interes_prestamo ?? 0;

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      socioId: '',
      prestamoId: '',
      montoCapital: 0,
      montoInteres: 0,
      fecha: hoyISO(),
    },
  });

  const montoCapital = form.watch('montoCapital') || 0;
  const montoInteres = form.watch('montoInteres') || 0;

  const prestamoSeleccionado = useMemo(
    () => prestamosActivosSocio.find((p) => p.id === prestamoSeleccionadoId) ?? null,
    [prestamosActivosSocio, prestamoSeleccionadoId]
  );

  const saldoPendiente = prestamoSeleccionado?.saldo_pendiente ?? 0;
  const interesEsperado = Math.round(saldoPendiente * tasa);
  const nuevoSaldo = Math.max(0, saldoPendiente - montoCapital);
  const totalPago = montoCapital + montoInteres;

  const excedeCapital = montoCapital > saldoPendiente;
  const cubreInteres = montoInteres >= interesEsperado;
  const hayMonto = montoCapital > 0 || montoInteres > 0;
  const invalido = !prestamoSeleccionado || !hayMonto || excedeCapital;

  function handleSocioChange(socioId: string) {
    setSocioSeleccionado(socioId);
    setPrestamoSeleccionadoId('');
    form.setValue('socioId', socioId);
    form.setValue('prestamoId', '');
    form.setValue('montoCapital', 0);
    form.setValue('montoInteres', 0);
  }

  function handlePrestamoSelect(prestamoId: string) {
    setPrestamoSeleccionadoId(prestamoId);
    form.setValue('prestamoId', prestamoId);
    form.setValue('montoCapital', 0);
    form.setValue('montoInteres', 0);
  }

  async function onSubmit(data: PagoFormData) {
    if (!grupo || invalido) return;
    const resultado = registrarPagoPrestamo({
      grupoId: grupo.id,
      prestamoId: data.prestamoId,
      montoCapital: data.montoCapital,
      montoInteres: data.montoInteres,
      fecha: data.fecha,
      userId: session?.userId,
    });
    if (resultado.ok) {
      const cancelado = nuevoSaldo <= 0;
      toast.success(
        cancelado
          ? 'Préstamo cancelado completamente'
          : 'Pago registrado'
      );
      form.reset();
      setSocioSeleccionado('');
      setPrestamoSeleccionadoId('');
      onOpenChange(false);
    } else {
      toast.error(resultado.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar pago de préstamo</DialogTitle>
          <DialogDescription>
            Selecciona el socio y el préstamo. Indica por separado el abono a capital y el
            interés del período.
          </DialogDescription>
        </DialogHeader>

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
                    onValueChange={(v) => {
                      field.onChange(v ?? '');
                      handleSocioChange(v ?? '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un socio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sociosConPrestamos.map((s) => (
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

            {socioSeleccionado && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  Préstamos activos
                </span>
                <TablaPrestamosActivos
                  prestamos={prestamosActivosSocio}
                  tasa={tasa}
                  prestamoSeleccionadoId={prestamoSeleccionadoId}
                  onSelect={handlePrestamoSelect}
                />
              </div>
            )}

            {prestamoSeleccionado && (
              <>
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Saldo Pendiente</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoneda(saldoPendiente)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Interés Periodo</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoneda(interesEsperado)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Nuevo Saldo</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoneda(nuevoSaldo)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="montoCapital"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abono a Capital ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
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
                    name="montoInteres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abono a Interés ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
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
              </>
            )}

            {prestamoSeleccionado && hayMonto && excedeCapital && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  El capital excede el saldo pendiente ({formatMoneda(saldoPendiente)}).
                </AlertDescription>
              </Alert>
            )}

            {prestamoSeleccionado && hayMonto && !excedeCapital && !cubreInteres && (
              <Alert variant="warning">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  El interés indicado ({formatMoneda(montoInteres)}) no cubre el período
                  actual ({formatMoneda(interesEsperado)}). El pago se registrará igualmente.
                </AlertDescription>
              </Alert>
            )}

            {prestamoSeleccionado && hayMonto && !invalido && (
              <Alert>
                <Info className="size-4" aria-hidden="true" />
                <AlertDescription>
                  Pago total: {formatMoneda(totalPago)} ({formatMoneda(montoCapital)} capital +{' '}
                  {formatMoneda(montoInteres)} interés).{nuevoSaldo <= 0 ? ' El préstamo queda cancelado.' : ` Nuevo saldo: ${formatMoneda(nuevoSaldo)}.`}
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
