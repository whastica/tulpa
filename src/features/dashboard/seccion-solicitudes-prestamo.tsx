'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { responderSolicitudPrestamo } from './operaciones';
import { formatMoneda } from '@/lib/format';
import { ModalSolicitarPrestamoSocio } from './acciones/modal-solicitar-prestamo-socio';
import { HandCoins, Check, X, Inbox } from 'lucide-react';
import type { Grupo, SolicitudPrestamo } from '@/types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ESTADO_CONFIG: Record<
  SolicitudPrestamo['estado'],
  { label: string; className: string }
> = {
  pendiente: { label: 'Pendiente', className: 'bg-warning/10 text-warning' },
  aprobada: { label: 'Aprobada', className: 'bg-success/10 text-success' },
  rechazada: { label: 'Rechazada', className: 'bg-destructive/10 text-destructive' },
};

function BadgeEstado({ estado }: { estado: SolicitudPrestamo['estado'] }) {
  const config = ESTADO_CONFIG[estado];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ──────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────

export function SeccionSolicitudesPrestamo({ grupo }: { grupo: Grupo }) {
  const { isPrincipal, session } = useSession();
  const todas = useMockStore((s) => s.solicitudesPrestamo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const [modalAbierto, setModalAbierto] = useState(false);

  const socios = useMemo(() => getSociosPorGrupo(grupo.id), [getSociosPorGrupo, grupo.id]);
  const solicitudes = useMemo(
    () =>
      todas
        .filter((s) => s.grupo_id === grupo.id)
        .sort((a, b) => b.fecha_solicitud.localeCompare(a.fecha_solicitud)),
    [todas, grupo.id]
  );

  const nombreSocio = (id: string) => socios.find((s) => s.id === id)?.nombre ?? 'Socio';
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const historial = solicitudes.filter((s) => s.estado !== 'pendiente');
  const misSolicitudes = solicitudes.filter((s) => s.socio_id === session?.socioId);

  function responder(solicitudId: string, aprobada: boolean) {
    const resultado = responderSolicitudPrestamo({
      solicitudId,
      aprobada,
      userId: session?.userId,
    });
    if (resultado.ok) {
      toast.success(aprobada ? 'Préstamo aprobado y registrado' : 'Solicitud rechazada');
    } else {
      toast.error(resultado.error);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HandCoins className="size-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground">Solicitudes de préstamo</h2>
            <p className="text-xs text-muted-foreground">
              {isPrincipal
                ? 'Aprueba o rechaza las peticiones de los socios.'
                : 'Solicita un préstamo y sigue su estado.'}
            </p>
          </div>
        </div>

        {!isPrincipal && (
          <Button size="sm" className="gap-1.5" onClick={() => setModalAbierto(true)}>
            <HandCoins className="size-4" aria-hidden="true" />
            Solicitar préstamo
          </Button>
        )}
      </div>

      {isPrincipal && (
        <>
          {pendientes.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Inbox className="size-4" aria-hidden="true" />
              No hay solicitudes pendientes de préstamo.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendientes.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col">
                    <p className="text-sm font-medium text-foreground">
                      {nombreSocio(s.socio_id)}{' '}
                      <span className="font-mono text-muted-foreground">
                        {formatMoneda(s.monto_solicitado)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado el {fechaCorta(s.fecha_solicitud)} · Pendiente
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => responder(s.id, false)}
                    >
                      <X className="size-4" aria-hidden="true" />
                      Rechazar
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => responder(s.id, true)}>
                      <Check className="size-4" aria-hidden="true" />
                      Aprobar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {historial.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Historial
              </p>
              <ul className="flex flex-col gap-2">
                {historial.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <p className="text-sm text-foreground">
                        {nombreSocio(s.socio_id)}{' '}
                        <span className="font-mono text-muted-foreground">
                          {formatMoneda(s.monto_solicitado)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fechaCorta(s.fecha_solicitud)}
                        {s.respuesta_nota ? ` · ${s.respuesta_nota}` : ''}
                      </p>
                    </div>
                    <BadgeEstado estado={s.estado} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!isPrincipal &&
        (misSolicitudes.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Inbox className="size-4" aria-hidden="true" />
            Aún no has solicitado un préstamo. Envía tu petición al principal.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {misSolicitudes.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <p className="text-sm font-medium text-foreground">
                    {formatMoneda(s.monto_solicitado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solicitado el {fechaCorta(s.fecha_solicitud)}
                    {s.respuesta_nota ? ` · ${s.respuesta_nota}` : ''}
                  </p>
                </div>
                <BadgeEstado estado={s.estado} />
              </li>
            ))}
          </ul>
        ))}

      {!isPrincipal && (
        <ModalSolicitarPrestamoSocio
          grupo={grupo}
          open={modalAbierto}
          onOpenChange={setModalAbierto}
        />
      )}
    </section>
  );
}