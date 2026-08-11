'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';

export default function Home() {
  const { isAuthenticated, hydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  return null;
}
