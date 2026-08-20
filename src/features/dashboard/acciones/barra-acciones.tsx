'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ModalAporte } from './modal-aporte';
import { ModalSolicitarPrestamo } from './modal-solicitar-prestamo';
import { ModalPagoPrestamo } from './modal-pago-prestamo';
import { ModalRetiro } from './modal-retiro';
import { ModalCierreORenovacion } from './modal-cierre-renovacion';
import { MoreHorizontal, Plus, Banknote, HandCoins, DoorOpen, RotateCcw } from 'lucide-react';
import type { Grupo } from '@/types';

type ModalTipo = 'aporte' | 'prestamo' | 'pago' | 'retiro' | 'cierre';

export function BarraAcciones({
  grupo,
  liquidez,
}: {
  grupo: Grupo;
  liquidez: number;
}) {
  const [modalActivo, setModalActivo] = useState<ModalTipo | null>(null);

  function cerrar() {
    setModalActivo(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setModalActivo('aporte')}>
          <Plus className="size-4" aria-hidden="true" />
          Aporte
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalActivo('prestamo')}>
          <HandCoins className="size-4" aria-hidden="true" />
          Préstamo
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalActivo('pago')}>
          <Banknote className="size-4" aria-hidden="true" />
          Pago
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalActivo('retiro')}>
          <DoorOpen className="size-4" aria-hidden="true" />
          Retiro
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" aria-label="Más acciones">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setModalActivo('cierre')}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Cierre / renovación
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ModalAporte open={modalActivo === 'aporte'} onOpenChange={(a) => !a && cerrar()} />
      <ModalSolicitarPrestamo
        open={modalActivo === 'prestamo'}
        onOpenChange={(a) => !a && cerrar()}
      />
      <ModalPagoPrestamo open={modalActivo === 'pago'} onOpenChange={(a) => !a && cerrar()} />
      <ModalRetiro
        open={modalActivo === 'retiro'}
        onOpenChange={(a) => !a && cerrar()}
        liquidez={liquidez}
      />
      <ModalCierreORenovacion
        open={modalActivo === 'cierre'}
        onOpenChange={(a) => !a && cerrar()}
        grupo={grupo}
      />
    </>
  );
}