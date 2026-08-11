'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMockStore } from '@/mocks';
import { useSession } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { EmptyState } from '@/components/empty-state';
import { formatMoneda } from '@/lib/format';
import {
  Landmark,
  ShieldCheck,
  Users,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useSession();
  const router = useRouter();
  const socios = useMockStore((s) => s.socios);
  const [seleccion, setSeleccion] = useState<'inicio' | 'socio'>('inicio');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  function handlePrincipal() {
    login('principal');
    router.push('/dashboard');
  }

  function handleSocio(socioId: string) {
    login('socio', socioId);
    router.push('/dashboard');
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

      <main className="relative z-10 flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Landmark className="size-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Tulpa
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Fondo de Ahorro y Crédito Comunal
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestión digital confiable para tu comunidad.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {seleccion === 'inicio' ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handlePrincipal}
                className="group flex items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    Entrar como Principal
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Administra el fondo, los socios y los movimientos.
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => setSeleccion('socio')}
                className="group flex items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <Users className="size-5" aria-hidden="true" />
                </div>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    Entrar como Socio
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Consulta tu ahorro, cuotas y préstamos.
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Selecciona tu perfil de socio
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSeleccion('inicio')}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Volver
                </Button>
              </div>

              {socios.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-8" />}
                  title="Sin socios registrados"
                  description="Aún no hay socios configurados en el grupo."
                />
              ) : (
                <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                  {socios.map((socio) => (
                    <button
                      key={socio.id}
                      type="button"
                      onClick={() => handleSocio(socio.id)}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                        >
                          {socio.nombre
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase() ?? '')
                            .join('')}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {socio.nombre}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatMoneda(socio.cuota_mensual_fija)}/mes
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}