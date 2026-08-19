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
import { registrarRetiro } from '../operaciones';
import { formatMoneda } from '@/lib/format';
import { DoorOpen, TriangleAlert, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const retiroSchema = z.object({
  socioId: z.string().min(1, 'Selecciona un socio'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
});

type RetiroFormData = z.infer<typeof retiroSchema>;

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

export function ModalRetiro({
  open,
  onOpenChange,
  liquidez,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidez: number;
}) {
  const { session } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const movimientos = useMockStore((s) => s.movimientos);

  const socios = useMemo(() => {
    if (!grupo) return [];
    return getSociosPorGrupo(grupo.id).filter((s) => s.estado === 'activo');
  }, [grupo, getSociosPorGrupo]);

  const form = useForm<RetiroFormData>({
    resolver: zodResolver(retiroSchema),
    defaultValues: { socioId: '', fecha: hoyISO() },
  });

  const socioId = form.watch('socioId');

  const socio = useMemo(() => socios.find((s) => s.id === socioId) ?? null, [socios, socioId]);

  const aportesTotales = useMemo(() => {
    if (!grupo || !socio) return 0;
    return movimientos
      .filter(
        (m) =>
          m.grupo_id === grupo.id &&
          m.socio_id === socio.id &&
          m.tipo === 'aporte'
      )
      .reduce((sum, m) => sum + m.monto, 0);
  }, [grupo, socio, movimientos]);

  const superaLiquidez = aportesTotales > liquidez;

  async function onSubmit(data: RetiroFormData) {
    if (!grupo || superaLiquidez) return;
    const resultado = registrarRetiro({
      grupoId: grupo.id,
      socioId: data.socioId,
      fecha: data.fecha,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success('Retiro registrado');
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
          <DialogTitle>Retiro anticipado</DialogTitle>
          <DialogDescription>
            El socio retirado recibe su capital aportado pero pierde derecho a rendimientos del ciclo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="socioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Socio que retira</FormLabel>
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

            {socio && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Capital a retirar</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoneda(aportesTotales)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Liquidez disponible</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoneda(liquidez)}
                  </span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del retiro</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {superaLiquidez && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>
                  Liquidez insuficiente. Disponible: {formatMoneda(liquidez)} — capital a retirar: {formatMoneda(aportesTotales)}.
                </AlertDescription>
              </Alert>
            )}

            {socio && !superaLiquidez && (
              <Alert>
                <Info className="size-4" aria-hidden="true" />
                <AlertDescription>
                  Se devolverán {formatMoneda(aportesTotales)} de capital. El socio perderá el
                  derecho a las ganancias del ciclo actual.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button
                type="submit"
                disabled={!socio || superaLiquidez}
                variant="destructive"
                className="gap-1.5"
              >
                <DoorOpen className="size-4" aria-hidden="true" />
                Confirmar retiro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}