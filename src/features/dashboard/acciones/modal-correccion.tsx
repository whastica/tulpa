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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { registrarCorreccion } from '../operaciones';
import { formatMoneda } from '@/lib/format';
import { AlertTriangle } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const correccionSchema = z.object({
  nota: z
    .string({ error: 'La nota es obligatoria' })
    .min(3, 'Describe el motivo de la corrección (mínimo 3 caracteres)')
    .max(300, 'Máximo 300 caracteres'),
});

type CorreccionFormData = z.infer<typeof correccionSchema>;

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function ModalCorreccion({
  open,
  onOpenChange,
  movimientoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimientoId: string | null;
}) {
  const { session } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const movimientos = useMockStore((s) => s.movimientos);
  const socios = useMockStore((s) => s.socios);

  const movimiento = useMemo(
    () => movimientos.find((m) => m.id === movimientoId) ?? null,
    [movimientos, movimientoId]
  );

  const form = useForm<CorreccionFormData>({
    resolver: zodResolver(correccionSchema),
    defaultValues: { nota: '' },
  });

  async function onSubmit(data: CorreccionFormData) {
    if (!grupo || !movimiento) return;
    const resultado = registrarCorreccion({
      grupoId: grupo.id,
      corrigeMovimientoId: movimiento.id,
      nota: data.nota,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success('Corrección registrada (no se modifica el movimiento original)');
      form.reset();
      onOpenChange(false);
    } else {
      toast.error(resultado.error);
    }
  }

  if (!movimiento) return null;

  const socio = socios.find((s) => s.id === movimiento.socio_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corregir registro</DialogTitle>
          <DialogDescription>
            No se edita ni elimina el movimiento original. Se crea una nueva entrada de
            corrección como referencia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-mono text-foreground">{movimiento.fecha}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span className="text-foreground capitalize">
              {movimiento.tipo.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Socio</span>
            <span className="text-foreground">{socio?.nombre ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-mono text-foreground">{formatMoneda(movimiento.monto)}</span>
          </div>
          {movimiento.nota && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nota</span>
              <span className="text-foreground">{movimiento.nota}</span>
            </div>
          )}
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription>
            Al confirmar, se crea un movimiento de tipo &quot;corrección&quot; que referencia al
            original.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="nota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la corrección</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe por qué se corrige este registro..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button type="submit" variant="destructive" className="gap-1.5">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Registrar corrección
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}