'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/features/auth';
import { cerrarCiclo, renovarCiclo, resumenCierre } from '../operaciones';
import { formatMoneda } from '@/lib/format';
import { Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Grupo } from '@/types';

export function ModalCierre({
  open,
  onOpenChange,
  grupo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: Grupo | null;
}) {
  const router = useRouter();
  const { session } = useSession();
  const [confirmando, setConfirmando] = useState(false);

  if (!grupo) return null;

  const esCierre = grupo.estado === 'activo';
  const resumen = resumenCierre(grupo.id);

  async function handleCerrar() {
    if (!grupo) return;
    setConfirmando(true);
    const resultado = cerrarCiclo({
      grupoId: grupo.id,
      userId: session?.userId,
    });
    if (!resultado.ok) {
      toast.error(resultado.error);
      setConfirmando(false);
      return;
    }
    toast.success('Ciclo cerrado correctamente');
    setConfirmando(false);
    onOpenChange(false);
  }

  async function handleRenovar() {
    if (!grupo) return;
    setConfirmando(true);
    const resultado = renovarCiclo({
      grupoId: grupo.id,
      userId: session?.userId,
    });
    if (!resultado.ok) {
      toast.error(resultado.error);
      setConfirmando(false);
      return;
    }
    toast.success('Nuevo ciclo iniciado');
    setConfirmando(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {esCierre ? 'Cierre de ciclo' : 'Renovar fondo'}
          </DialogTitle>
          <DialogDescription>
            {esCierre
              ? 'Se bloquearán aportes, préstamos y pagos. No se puede deshacer.'
              : 'Se creará un nuevo ciclo heredando el fondo del ciclo anterior.'}
          </DialogDescription>
        </DialogHeader>

        {resumen && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <h4 className="font-medium text-foreground">Resumen del ciclo</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Fondo total</span>
                <span className="font-mono text-foreground">{formatMoneda(resumen.fondoTotal)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Préstamos activos</span>
                <span className="font-mono text-foreground">{formatMoneda(resumen.prestamosActivos)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Rendimientos</span>
                <span className="font-mono text-foreground">{formatMoneda(resumen.rendimientos)}</span>
              </div>
            </div>
          </div>
        )}

        {esCierre ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>Acción irreversible</AlertTitle>
            <AlertDescription>
              Al cerrar el ciclo no se podrán registrar más aportes, préstamos ni pagos.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <RefreshCw className="size-4" aria-hidden="true" />
            <AlertTitle>Nuevo ciclo</AlertTitle>
            <AlertDescription>
              El fondo se transferirá al nuevo ciclo y la membresía se reiniciará.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={confirmando}>Cancelar</Button>} />
          {esCierre ? (
            <Button
              variant="destructive"
              onClick={handleCerrar}
              disabled={confirmando}
              className="gap-1.5"
            >
              <Lock className="size-4" aria-hidden="true" />
              Cerrar ciclo
            </Button>
          ) : (
            <Button onClick={handleRenovar} disabled={confirmando} className="gap-1.5">
              <RefreshCw className="size-4" aria-hidden="true" />
              Renovar fondo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}