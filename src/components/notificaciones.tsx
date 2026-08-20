'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellRing } from 'lucide-react';

export function NotificacionesBell() {
  const { isPrincipal, isSocio, session } = useSession();
  const notificaciones = useMockStore((s) => s.notificaciones);
  const marcarTodasLeidasParaRol = useMockStore((s) => s.marcarTodasLeidasParaRol);
  const router = useRouter();

  const rol = isPrincipal ? 'principal' : isSocio ? 'socio' : null;

  const paraMi = rol
    ? notificaciones.filter((n) =>
        rol === 'principal'
          ? n.para_rol === 'principal'
          : n.para_rol === 'socio' && n.socio_id === session?.socioId
      )
    : [];
  const sinLeer = paraMi.filter((n) => !n.leida).length;

  function abrir() {
    if (rol) marcarTodasLeidasParaRol(rol);
  }

  function irAGrupo(grupoId: string) {
    router.push(`/dashboard/grupos/${grupoId}`);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && abrir()}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
            {sinLeer > 0 ? (
              <BellRing className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <Bell className="size-5" aria-hidden="true" />
            )}
            {sinLeer > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {sinLeer > 9 ? '9+' : sinLeer}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          Notificaciones
          {sinLeer > 0 ? ` · ${sinLeer} sin leer` : ''}
        </DropdownMenuLabel>
        {paraMi.length === 0 ? (
          <div className="px-1.5 py-6 text-center text-sm text-muted-foreground">
            Sin notificaciones por ahora.
          </div>
        ) : (
          paraMi
            .slice()
            .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
            .map((n) => (
              <DropdownMenuItem key={n.id} onClick={() => irAGrupo(n.grupo_id)}>
                <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
                  <span className="text-sm font-medium text-foreground">{n.titulo}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.mensaje}</span>
                </span>
              </DropdownMenuItem>
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}