'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Grupo } from '@/types';
import { Ticket, Copy, Check } from 'lucide-react';

export function TarjetaInvitacion({ grupo }: { grupo: Grupo }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/login?codigo=${encodeURIComponent(grupo.codigo)}`
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard no disponible: el usuario puede copiar el enlace manualmente.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Ticket className="size-5" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Invitación al grupo</p>
          <p className="text-xs text-muted-foreground">
            Comparte este enlace (o el código{' '}
            <span className="font-mono font-semibold text-foreground">{grupo.codigo}</span>)
            para que los socios entren directo a este grupo de ahorro.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <code className="hidden rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground md:block">
          /login?codigo={grupo.codigo}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={copiar}
        >
          {copiado ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copiado ? 'Copiado' : 'Copiar enlace'}
        </Button>
      </div>
    </div>
  );
}