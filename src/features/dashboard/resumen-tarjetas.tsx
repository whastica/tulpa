'use client';

import { StatCard } from '@/components/stat-card';
import { formatMoneda } from '@/lib/format';
import { PiggyBank, Wallet, CreditCard, TrendingUp } from 'lucide-react';

type ResumenTarjetasProps = {
  fondoTotal: number;
  liquidez: number;
  prestamosActivos: { cantidad: number; total: number };
  rendimientos: number;
};

export function ResumenTarjetas({
  fondoTotal,
  liquidez,
  prestamosActivos,
  rendimientos,
}: ResumenTarjetasProps) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Fondo Total"
        value={formatMoneda(fondoTotal)}
        icon={<PiggyBank className="size-4" aria-hidden="true" />}
        accent="primary"
        description="Ingresos del fondo − retiros"
      />
      <StatCard
        label="Liquidez Disponible"
        value={formatMoneda(liquidez)}
        icon={<Wallet className="size-4" aria-hidden="true" />}
        accent="success"
        description="Efectivo disponible para desembolsos"
      />
      <StatCard
        label="Préstamos Activos"
        value={`${prestamosActivos.cantidad} · ${formatMoneda(prestamosActivos.total)}`}
        icon={<CreditCard className="size-4" aria-hidden="true" />}
        accent="warning"
        description="Saldo pendiente por cobrar"
      />
      <StatCard
        label="Rendimientos Totales"
        value={formatMoneda(rendimientos)}
        icon={<TrendingUp className="size-4" aria-hidden="true" />}
        accent="info"
        description="Intereses de préstamos + multas por mora"
      />
    </div>
  );
}