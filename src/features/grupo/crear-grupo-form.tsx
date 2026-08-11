'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMockStore } from '@/mocks';
import { useSession } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema de validación
// ──────────────────────────────────────────────

const grupoSchema = z
  .object({
    nombre: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .min(3, 'Mínimo 3 caracteres')
      .max(100, 'Máximo 100 caracteres'),
    fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fecha_cierre_pactada: z
      .string()
      .min(1, 'La fecha de cierre es obligatoria'),
    tasa_interes_prestamo: z
      .number({ error: 'Debe ser un número válido' })
      .min(0, 'Mínimo 0%')
      .max(25, 'Máximo 25% (usura en Colombia)'),
    porcentaje_mora: z
      .number({ error: 'Debe ser un número válido' })
      .min(0, 'Mínimo 0%')
      .max(15, 'Máximo 15%'),
  })
  .refine((data) => data.fecha_cierre_pactada > data.fecha_inicio, {
    message: 'La fecha de cierre debe ser posterior a la fecha de inicio',
    path: ['fecha_cierre_pactada'],
  });

type GrupoFormData = z.infer<typeof grupoSchema>;

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function CrearGrupoForm() {
  const crearGrupo = useMockStore((s) => s.crearGrupo);
  const session = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GrupoFormData>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nombre: '',
      fecha_inicio: '',
      fecha_cierre_pactada: '',
      tasa_interes_prestamo: 0,
      porcentaje_mora: 0,
    },
  });

  function onSubmit(data: GrupoFormData) {
    crearGrupo({
      nombre: data.nombre,
      fecha_inicio: data.fecha_inicio,
      fecha_cierre_pactada: data.fecha_cierre_pactada,
      tasa_interes_prestamo: data.tasa_interes_prestamo / 100,
      porcentaje_mora: data.porcentaje_mora / 100,
      principal_user_id: session.session?.userId ?? '',
    });
    reset();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Nombre del grupo */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre del grupo</Label>
          <Input
            id="nombre"
            placeholder="Ej: Fondo Ahorro San José"
            {...register('nombre')}
          />
          {errors.nombre && (
            <p className="text-sm font-medium text-destructive">
              {errors.nombre.message}
            </p>
          )}
        </div>

        {/* Fechas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
            <Input id="fecha_inicio" type="date" {...register('fecha_inicio')} />
            {errors.fecha_inicio && (
              <p className="text-sm font-medium text-destructive">
                {errors.fecha_inicio.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha_cierre_pactada">Fecha de cierre</Label>
            <Input
              id="fecha_cierre_pactada"
              type="date"
              {...register('fecha_cierre_pactada')}
            />
            {errors.fecha_cierre_pactada && (
              <p className="text-sm font-medium text-destructive">
                {errors.fecha_cierre_pactada.message}
              </p>
            )}
          </div>
        </div>

        {/* Tasas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tasa_interes_prestamo">
              Tasa de interés mensual (%)
            </Label>
            <Input
              id="tasa_interes_prestamo"
              type="number"
              step="0.01"
              min="0"
              max="25"
              {...register('tasa_interes_prestamo', { valueAsNumber: true })}
            />
            {errors.tasa_interes_prestamo && (
              <p className="text-sm font-medium text-destructive">
                {errors.tasa_interes_prestamo.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porcentaje_mora">
              Porcentaje de mora (%)
            </Label>
            <Input
              id="porcentaje_mora"
              type="number"
              step="0.01"
              min="0"
              max="15"
              {...register('porcentaje_mora', { valueAsNumber: true })}
            />
            {errors.porcentaje_mora && (
              <p className="text-sm font-medium text-destructive">
                {errors.porcentaje_mora.message}
              </p>
            )}
          </div>
        </div>

        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            La tasa de interés máxima es 25% mensual para cumplir con la normativa
            anti-usura en Colombia. La mora aplica sobre cuotas de ahorro no pagadas.
          </AlertDescription>
        </Alert>

        {/* Botón */}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            Crear Grupo
          </Button>
        </div>
      </form>
    </div>
  );
}
