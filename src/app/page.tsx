'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { ThemeToggle } from '@/components/theme-toggle';
import { Landmark, Plus, FolderOpen, ArrowRight } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, hydrated, login } = useSession();
  const iniciarNuevoGrupo = useMockStore((s) => s.iniciarNuevoGrupo);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hydrated, isAuthenticated, router]);

  if (hydrated && isAuthenticated) {
    return null;
  }

  function handleCrearGrupo() {
    // Mock sin contraseña: crear un grupo entra directamente como Principal.
    // Cuando llegue Google Auth, este paso requerirá autenticación primero.
    login('principal');
    iniciarNuevoGrupo();
    router.push('/dashboard');
  }

  function handleGestionar() {
    router.push('/grupos');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Fondo sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_srgb,var(--primary)_8%,transparent),_transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_color-mix(in_srgb,var(--info)_6%,transparent),_transparent_55%)]"
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Landmark className="size-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Bienvenido a Tulpa
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Fondo de Ahorro y Crédito Comunal
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea o únete a un grupo de ahorro y gestiona tus finanzas comunales en un solo lugar.
            </p>
          </div>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2 sm:gap-6">
          <button
            type="button"
            onClick={handleGestionar}
            className="group flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-8"
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <FolderOpen className="size-6" aria-hidden="true" />
            </div>
            <span className="flex flex-col gap-2">
              <span className="text-lg font-semibold text-foreground sm:text-xl">
                Gestionar grupo
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                Entra a un grupo existente como Principal o como Socio.
              </span>
            </span>
            <span className="mt-auto flex items-center gap-2 text-sm font-medium text-primary">
              Elegir grupo
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>

          <button
            type="button"
            onClick={handleCrearGrupo}
            className="group flex flex-col gap-6 rounded-2xl bg-[#60A5FA] p-6 text-left text-[#081226] shadow-card transition-all hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-8"
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#081226]/15">
              <Plus className="size-6" aria-hidden="true" />
            </div>
            <span className="flex flex-col gap-2">
              <span className="text-lg font-semibold sm:text-xl">
                Crear nuevo grupo de ahorro
              </span>
              <span className="text-sm leading-relaxed text-[#081226]/80">
                Configura las reglas del fondo y la membresía como Principal.
              </span>
            </span>
            <span className="mt-auto flex items-center gap-2 text-sm font-medium text-[#081226]">
              Comenzar
              <ArrowRight
                className="size-4 text-[#081226]/70 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ¿Recibiste un enlace de invitación? Entra directo desde el código de tu grupo de ahorro.
        </p>
      </main>
    </div>
  );
}