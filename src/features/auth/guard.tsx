'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { RolUsuario } from '@/types';
import { useSession } from './context';

type RouteGuardProps = {
  children: ReactNode;
  allowedRoles: RolUsuario[];
  redirectTo?: string;
};

export function RouteGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RouteGuardProps) {
  const { isAuthenticated, session, hydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (session && !allowedRoles.includes(session.rol)) {
      router.replace(redirectTo);
    }
  }, [hydrated, isAuthenticated, session, allowedRoles, redirectTo, router]);

  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (session && !allowedRoles.includes(session.rol)) {
    return null;
  }

  return <>{children}</>;
}
