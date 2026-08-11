'use client';

import { RouteGuard } from '@/features/auth';
import { PageHeader } from '@/components/page-header';

export default function AdminPage() {
  return (
    <RouteGuard allowedRoles={['principal']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Escritura"
          title="Panel de Administración"
          description="Registra aportes, préstamos y movimientos del grupo."
        />

        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Este panel estará disponible en las próximas épicas para registrar aportes, préstamos y
            otros movimientos del grupo.
          </p>
        </div>
      </div>
    </RouteGuard>
  );
}