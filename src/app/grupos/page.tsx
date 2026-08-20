'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMockStore } from '@/mocks';
import { useSession } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { formatFecha } from '@/lib/format';
import {
  Landmark,
  Plus,
  FolderOpen,
  ChevronRight,
  Calendar,
  Ticket,
  ArrowLeft,
} from 'lucide-react';

function estadoBadge(estado: string) {
  switch (estado) {
    case 'activo':
      return { status: 'success' as const, label: 'Activo' };
    case 'cerrado':
      return { status: 'neutral' as const, label: 'Cerrado' };
    default:
      return { status: 'neutral' as const, label: estado };
  }
}

export default function GruposPage() {
  const router = useRouter();
  const { login } = useSession();
  const grupos = useMockStore((s) => s.grupos);
  const seleccionarGrupo = useMockStore((s) => s.seleccionarGrupo);
  const iniciarNuevoGrupo = useMockStore((s) => s.iniciarNuevoGrupo);

  function handleEntrarGrupo(grupoId: string, codigo: string) {
    seleccionarGrupo(grupoId);
    router.push(`/login?codigo=${encodeURIComponent(codigo)}`);
  }

  function handleCrearGrupo() {
    login('principal');
    iniciarNuevoGrupo();
    router.push('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_srgb,var(--primary)_8%,transparent),_transparent_60%)]"
      />

      <main className="relative z-10 flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <Landmark className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                Tulpa
              </span>
              <span className="text-[11px] text-muted-foreground">
                Gestionar grupos de ahorro
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                Tus grupos de ahorro
              </h1>
              <p className="text-sm text-muted-foreground">
                Selecciona un grupo para entrar como Principal o como Socio.
              </p>
            </div>
            <Button type="button" onClick={handleCrearGrupo} className="shrink-0 gap-1.5">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo
            </Button>
          </div>

          {grupos.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <EmptyState
                icon={<FolderOpen className="size-10" aria-hidden="true" />}
                title="Aún no hay grupos"
                description="Crea tu primer grupo de ahorro para comenzar."
                action={
                  <Button type="button" onClick={handleCrearGrupo} className="gap-1.5">
                    <Plus className="size-4" aria-hidden="true" />
                    Crear nuevo grupo de ahorro
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {grupos.map((g) => {
                const badge = estadoBadge(g.estado);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleEntrarGrupo(g.id, g.codigo)}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Landmark className="size-6" aria-hidden="true" />
                    </div>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-semibold text-foreground">
                          {g.nombre}
                        </span>
                        <StatusBadge
                          status={badge.status}
                          label={badge.label}
                          showIcon={false}
                          className="px-2 py-0 text-[10px]"
                        />
                      </span>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" aria-hidden="true" />
                          {formatFecha(g.fecha_inicio)} → {formatFecha(g.fecha_cierre_pactada)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Ticket className="size-3.5" aria-hidden="true" />
                          Código: <strong className="font-mono text-foreground">{g.codigo}</strong>
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Recibiste un enlace de invitación? Entra directo con el código de tu grupo en{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">/login?codigo=XXXXXX</code>
        </p>
      </main>
    </div>
  );
}