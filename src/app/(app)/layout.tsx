'use client';

import { RouteGuard } from '@/features/auth';
import { AppShell } from '@/components/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['principal', 'socio']}>
      <div className="min-h-screen bg-background">
        <AppShell>{children}</AppShell>
      </div>
    </RouteGuard>
  );
}