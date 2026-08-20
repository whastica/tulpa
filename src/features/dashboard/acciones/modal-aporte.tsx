'use client';

import { useMemo, useRef, useState } from 'react';
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
import { registrarAporte } from '../operaciones';
import { calcularEstadoPagoSocio, ultimoMesConMovimientos, type EstadoPagoSocio } from '../metrics';
import { formatMoneda, valorNumeroFinito } from '@/lib/format';
import {
  COMPROBANTE_ACCEPT,
  esComprobanteValido,
  archivoAComprobante,
} from '@/lib/comprobante';
import { HandCoins, Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import type { Socio } from '@/types';

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const aporteSchema = z.object({
  socioId: z.string().min(1, 'Selecciona un socio'),
  tipo: z.enum(['aporte', 'mora'], { error: 'Selecciona el tipo' }),
  monto: z
    .number({ error: 'Debe ser un número válido' })
    .positive('Debe ser mayor a 0')
    .int('Debe ser un número entero'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  nota: z.string().max(200, 'Máximo 200 caracteres').optional(),
  comprobante: z
    .string()
    .optional()
    .refine(
      (v) => !v || esComprobanteValido(v),
      'Debe ser una imagen JPG, PNG o WebP'
    ),
});

type AporteFormData = z.infer<typeof aporteSchema>;

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

export function ModalAporte({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const movimientos = useMockStore((s) => s.movimientos);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estadoPago, setEstadoPago] = useState<EstadoPagoSocio | null>(null);

  const socios = useMemo(() => {
    if (!grupo) return [];
    return getSociosPorGrupo(grupo.id).filter((s) => s.estado === 'activo');
  }, [grupo, getSociosPorGrupo]);

  const form = useForm<AporteFormData>({
    resolver: zodResolver(aporteSchema),
    defaultValues: {
      socioId: '',
      tipo: 'aporte',
      monto: 0,
      fecha: hoyISO(),
      nota: '',
      comprobante: undefined,
    },
  });

  const comprobante = form.watch('comprobante');

  function handleSocioChange(socioId: string) {
    const socio = socios.find((s: Socio) => s.id === socioId);
    form.setValue('socioId', socioId, { shouldValidate: true });

    if (!socio || !grupo) {
      setEstadoPago(null);
      return;
    }

    const ultimoMes = ultimoMesConMovimientos(movimientos, grupo.id);
    const estado = calcularEstadoPagoSocio(
      socio,
      movimientos,
      grupo.porcentaje_mora,
      ultimoMes
    );
    setEstadoPago(estado);

    if (estado.mesesAtrasados > 0) {
      form.setValue('monto', estado.totalACobrar, { shouldValidate: true });
    } else {
      form.setValue('monto', socio.cuota_mensual_fija, { shouldValidate: true });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await archivoAComprobante(file);
      form.setValue('comprobante', dataUrl, { shouldValidate: true });
    } catch {
      toast.error('No se pudo leer el archivo. Usa JPG, PNG o WebP.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemoveComprobante() {
    form.setValue('comprobante', undefined, { shouldValidate: true });
  }

  function handleReset() {
    form.reset();
    setEstadoPago(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const enMora = estadoPago !== null && estadoPago.mesesAtrasados > 0;

  async function onSubmit(data: AporteFormData) {
    if (!grupo) return;

    const resultado = registrarAporte({
      grupoId: grupo.id,
      tipo: data.tipo,
      socioId: data.socioId,
      monto: data.monto,
      fecha: data.fecha,
      nota: data.nota,
      comprobanteUrl: data.comprobante,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success('Aporte registrado correctamente');
      handleReset();
      onOpenChange(false);
    } else {
      toast.error(resultado.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar aporte / mora</DialogTitle>
          <DialogDescription>
            Registra una cuota de ahorro o una multa por mora para un socio activo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="socioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Socio</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => handleSocioChange(v ?? '')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un socio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {socios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre} · {formatMoneda(s.cuota_mensual_fija)}/mes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {enMora && estadoPago && (
              <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-warning">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {estadoPago.mesesAtrasados} mes{estadoPago.mesesAtrasados > 1 ? 'es' : ''} atrasado{estadoPago.mesesAtrasados > 1 ? 's' : ''}
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Cuota(s) atrasada(s) ({estadoPago.mesesAtrasados} × {formatMoneda(estadoPago.cuotaActual)})
                    </span>
                    <span className="font-mono text-foreground">{formatMoneda(estadoPago.cuotaAtrasada)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cuota mes en curso</span>
                    <span className="font-mono text-foreground">{formatMoneda(estadoPago.cuotaActual)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recargo por mora</span>
                    <span className="font-mono text-foreground">{formatMoneda(estadoPago.recargoMora)}</span>
                  </div>
                  <div className="border-t border-warning/30 pt-2">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-foreground">Total a cobrar</span>
                      <span className="font-mono text-foreground">{formatMoneda(estadoPago.totalACobrar)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? 'aporte')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aporte">Aporte (cuota de ahorro)</SelectItem>
                      <SelectItem value="mora">Mora (multa)</SelectItem>
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
                    <FormLabel>Monto ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
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

            <FormField
              control={form.control}
              name="nota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Pago cuota junio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comprobante"
              render={() => (
                <FormItem>
                  <FormLabel>Comprobante de pago (opcional)</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={COMPROBANTE_ACCEPT}
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {comprobante ? (
                        <div className="relative flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                          <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border">
                            {esComprobanteValido(comprobante) ? (
                              <img
                                src={comprobante}
                                alt="Comprobante"
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <ImageIcon className="size-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="flex-1 truncate text-xs text-muted-foreground">
                            Comprobante adjunto
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={handleRemoveComprobante}
                          >
                            <X className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="size-3.5" aria-hidden="true" />
                            Subir imagen
                          </Button>
                          <span className="flex items-center text-xs text-muted-foreground">
                            JPG, PNG o WebP
                          </span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button variant="outline" onClick={handleReset}>Cancelar</Button>} />
              <Button type="submit" className="gap-1.5">
                <HandCoins className="size-4" aria-hidden="true" />
                Confirmar aporte
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}