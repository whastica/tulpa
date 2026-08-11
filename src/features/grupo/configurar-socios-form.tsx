'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Grupo } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResumenInicio } from './resumen-inicio';
import { Users, ArrowLeft, ArrowRight } from 'lucide-react';

// ──────────────────────────────────────────────
// Schema de validación
// ──────────────────────────────────────────────

const socioSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  cuota_mensual: z
    .number({ error: 'Debe ser un número válido' })
    .int('Debe ser un número entero')
    .min(1, 'Debe ser mayor a 0'),
});

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

type SocioConfig = {
  nombre: string;
  cuota_mensual: number;
};

type Paso = 'cantidad' | 'datos' | 'resumen';

// ──────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────

const MIN_SOCIOS = 5;
const MAX_SOCIOS = 30;

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function ConfigurarSociosForm({ grupo }: { grupo: Grupo }) {
  const [paso, setPaso] = useState<Paso>('cantidad');
  const [socios, setSocios] = useState<SocioConfig[]>([]);

  // Formulario para cantidad
  const cantidadForm = useForm<{ cantidad: number }>({
    resolver: zodResolver(
      z.object({
        cantidad: z
          .number({ error: 'Debe ser un número válido' })
          .int('Debe ser un número entero')
          .min(MIN_SOCIOS, `Mínimo ${MIN_SOCIOS} socios`)
          .max(MAX_SOCIOS, `Máximo ${MAX_SOCIOS} socios`),
      })
    ),
    defaultValues: { cantidad: 15 },
  });

  // Formulario para datos de socios
  const datosForm = useForm<{ socios: SocioConfig[] }>({
    resolver: zodResolver(
      z.object({
        socios: z.array(socioSchema).min(1, 'Debe agregar al menos un socio'),
      })
    ),
    defaultValues: { socios: [] },
  });

  function onCantidadSubmit(data: { cantidad: number }) {
    // Inicializar array de socios vacíos
    const sociosVacios = Array.from({ length: data.cantidad }, () => ({
      nombre: '',
      cuota_mensual: 0,
    }));
    setSocios(sociosVacios);
    datosForm.setValue('socios', sociosVacios);
    setPaso('datos');
  }

  function onDatosSubmit(data: { socios: SocioConfig[] }) {
    setSocios(data.socios);
    setPaso('resumen');
  }

  function handleVolverAEditar() {
    setPaso('datos');
  }

  if (paso === 'resumen') {
    return (
      <ResumenInicio
        grupo={grupo}
        socios={socios}
        onVolver={handleVolverAEditar}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      {/* Header with steps indicator */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-bold text-foreground">Configurar Socios</h2>
          <p className="text-sm text-muted-foreground">
            {paso === 'cantidad'
              ? 'Define cuántos socios tendrá tu grupo.'
              : 'Ingresa el nombre y la cuota mensual de cada socio.'}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <div className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
            paso === 'cantidad' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}>
            1
          </div>
          <div className="h-0.5 w-8 bg-border" />
          <div className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
            paso === 'datos' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}>
            2
          </div>
        </div>
      </div>

      {paso === 'cantidad' && (
        <form
          onSubmit={cantidadForm.handleSubmit(onCantidadSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cantidad">Número de socios</Label>
            <Input
              id="cantidad"
              type="number"
              min={MIN_SOCIOS}
              max={MAX_SOCIOS}
              {...cantidadForm.register('cantidad', { valueAsNumber: true })}
            />
            {cantidadForm.formState.errors.cantidad && (
              <p className="text-sm font-medium text-destructive">
                {cantidadForm.formState.errors.cantidad.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Entre {MIN_SOCIOS} y {MAX_SOCIOS} integrantes
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" className="gap-2">
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      )}

      {paso === 'datos' && (
        <form
          onSubmit={datosForm.handleSubmit(onDatosSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
            {socios.map((_, index) => (
              <div
                key={index}
                className="grid gap-3 sm:grid-cols-[1fr_140px] items-end p-3 rounded-lg border border-border bg-background"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`socio-${index}-nombre`}>
                    Socio {index + 1}
                  </Label>
                  <Input
                    id={`socio-${index}-nombre`}
                    placeholder="Nombre completo"
                    {...datosForm.register(`socios.${index}.nombre`)}
                  />
                  {datosForm.formState.errors.socios?.[index]?.nombre && (
                    <p className="text-sm font-medium text-destructive">
                      {datosForm.formState.errors.socios?.[index]?.nombre?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`socio-${index}-cuota`}>
                    Cuota mensual ($)
                  </Label>
                  <Input
                    id={`socio-${index}-cuota`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    {...datosForm.register(`socios.${index}.cuota_mensual`, {
                      valueAsNumber: true,
                    })}
                  />
                  {datosForm.formState.errors.socios?.[index]?.cuota_mensual && (
                    <p className="text-sm font-medium text-destructive">
                      {datosForm.formState.errors.socios?.[index]?.cuota_mensual?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaso('cantidad')}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Button>
            <Button type="submit" size="lg" className="gap-2">
              Revisar configuración
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
