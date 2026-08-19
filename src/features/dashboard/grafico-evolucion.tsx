'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { PuntoSerie } from './metrics';
import { EmptyState } from '@/components/empty-state';
import { formatMoneda } from '@/lib/format';
import { LineChart as LineChartIcon } from 'lucide-react';

type GraficoEvolucionProps = {
  serie: PuntoSerie[];
};

export function GraficoEvolucion({ serie }: GraficoEvolucionProps) {
  if (serie.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
        <h2 className="font-heading text-xl font-bold text-foreground">
          Evolución del fondo
        </h2>
        <EmptyState
          icon={<LineChartIcon className="size-10" aria-hidden="true" />}
          title="Sin historial suficiente"
          description="El gráfico de evolución del fondo estará disponible cuando existan movimientos en más de un mes."
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="font-heading text-xl font-bold text-foreground">
          Evolución del fondo
        </h2>
        <p className="text-sm text-muted-foreground">
          Fondo total mes a mes desde la fecha de inicio del grupo.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="fondoTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="etiqueta"
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={80}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              formatter={(valor) =>
                typeof valor === 'number' ? formatMoneda(valor) : String(valor ?? '')
              }
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="fondoTotal"
              name="Fondo total"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#fondoTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}