'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/features/auth';
import { useMockStore } from '@/mocks';
import { aceptarReglamento } from '@/features/dashboard/operaciones';
import { Landmark, ShieldCheck, BadgePercent, HandCoins } from 'lucide-react';

// ──────────────────────────────────────────────
// Reglamento del Fondo (HU: Aceptación de términos)
// Gatekeeper bloqueante para los socios que aún no aceptan el contrato.
// ──────────────────────────────────────────────

export function ModalReglamentoFondo() {
  const { session } = useSession();
  const socioId = session?.socioId ?? null;
  const socio = useMockStore((s) =>
    socioId ? (s.socios.find((x) => x.id === socioId) ?? null) : null
  );

  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const debeMostrar = !!session && session.rol === 'socio' && !!socio && !socio.aceptoTerminos;

  async function handleIngresar() {
    if (!socio || !session) return;
    setEnviando(true);
    const resultado = aceptarReglamento({ socioId: socio.id, userId: session.userId });
    if (!resultado.ok) {
      toast.error(resultado.error);
      setEnviando(false);
      return;
    }
    toast.success('Reglamento aceptado. Bienvenido al fondo.');
    setAcepto(false);
    setEnviando(false);
  }

  if (!debeMostrar) return null;

  return (
    <Dialog open disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Landmark className="size-5 text-primary" aria-hidden="true" />
            Reglamento y Condiciones de Uso del Fondo Comunal (Tulpa)
          </DialogTitle>
          <DialogDescription>
            Antes de acceder al dashboard de control, debes leer, comprender y aceptar el presente
            reglamento. Tu participación activa en el grupo implica la aceptación de obligaciones de
            pago, límites de crédito, penalidades por mora y la constitución de tu ahorro como
            garantía real de tus obligaciones.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="flex flex-col gap-4 pr-3 text-sm leading-relaxed text-foreground">

            {/* 1. Objeto del Contrato y Naturaleza de la Plataforma */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="mb-1 font-semibold text-foreground">
                1. Objeto del Contrato y Naturaleza de la Plataforma
              </h3>
              <p className="mb-2">
                La plataforma Tulpa es exclusivamente un servicio tecnológico de registro,
                transparencia, notificación y auditoría visual. Tulpa NO custodia, NO transfiere, NO
                capta, ni administra dinero del público. Todo el dinero físico o digital es
                recaudado y custodiado de manera autónoma y externa por el usuario designado como
                "Principal" (Administrador) en la cuenta bancaria o medio que el grupo haya elegido
                por consenso. El modelo se basa en un esquema de confianza de grupo cerrado,
                manteniéndose fuera del ámbito de intermediación financiera regulado por el Decreto
                4334 de 2008 y el Art. 316 del Código Penal colombiano.
              </p>
              <p>
                Al ingresar al grupo, el Socio se obliga a pagar puntualmente su cuota mensual fija
                (definida de manera inmutable al inicio del ciclo) durante todo el periodo pactado.
              </p>
            </div>

            {/* 2. Responsabilidad Intransferible del Crédito */}
            <Alert>
              <ShieldCheck className="size-4" aria-hidden="true" />
              <AlertTitle>2. Responsabilidad Intransferible del Crédito</AlertTitle>
              <AlertDescription>
                Los préstamos se otorgan única y exclusivamente al Socio debidamente autenticado en
                la plataforma. Independientemente de si el Socio destina los fondos para su uso
                personal o para un tercero (sea o no miembro del grupo), la responsabilidad legal,
                financiera y contractual de devolver el capital y los intereses recae al 100% sobre
                el Socio registrado. El grupo y la plataforma no reconocen deudores externos.
              </AlertDescription>
            </Alert>

            {/* 3. Límite de Préstamo por Ahorro (Tope de Doble Control) */}
            <Alert>
              <BadgePercent className="size-4" aria-hidden="true" />
              <div className="flex flex-col gap-1 text-sm text-foreground">
                <AlertTitle>3. Límite de Préstamo por Ahorro (Tope de Doble Control)</AlertTitle>
                <p>
                  Para mitigar el riesgo de impago y proteger la rentabilidad del fondo, el monto
                  máximo de un préstamo individual estará sujeto a un doble control dinámico:
                </p>
                <p>
                  <strong className="font-semibold">Tope Individual (2x):</strong> No podrá superar
                  el doble del capital neto que el socio haya ahorrado en cuotas a la fecha de la
                  solicitud (Ejemplo: si ha ahorrado $400.000 COP, su tope máximo de crédito será de
                  $800.000 COP).
                </p>
                <p>
                  <strong className="font-semibold">Tope Global (50%):</strong> En ningún caso el
                  préstamo podrá superar el 50% de la liquidez total disponible en el fondo común del
                  grupo al momento de la solicitud.
                </p>
              </div>
            </Alert>

            {/* 4. Garantía Real, Bloqueo de Retiro y Cruce de Cartera */}
            <Alert>
              <HandCoins className="size-4" aria-hidden="true" />
              <div className="flex flex-col gap-1 text-sm text-foreground">
                <AlertTitle>
                  4. Garantía Real, Bloqueo de Retiro y Cruce de Cartera
                </AlertTitle>
                <p>
                  El ahorro acumulado por cada Socio actúa como colateral directo y garantía real
                  de sus deudas vigentes con el fondo.
                </p>
                <p>
                  <strong className="font-semibold">Bloqueo:</strong> Un Socio con un préstamo
                  activo NO podrá solicitar un retiro anticipado ni desvincularse del grupo bajo
                  ninguna circunstancia sin estar a "Paz y Salvo".
                </p>
                <p>
                  <strong className="font-semibold">Cruce de Cartera:</strong> En caso de mora
                  prolongada (según los tiempos pactados por el grupo), el Principal queda
                  expresamente facultado por el Socio mediante este acto para ejecutar el "Cruce de
                  Cartera", tomando el ahorro acumulado del Socio moroso para cubrir el saldo
                  pendiente del préstamo (Capital + Intereses + Mora).
                </p>
              </div>
            </Alert>

            {/* 5. Obligatoriedad de Participación Crediticia */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="mb-1 font-semibold text-foreground">
                5. Obligatoriedad de Participación Crediticia
              </h3>
              <p>
                Con el fin de garantizar la sostenibilidad financiera y la generación de
                rendimientos para todo el colectivo, cada Socio se compromete a tomar al menos un (1)
                préstamo durante la vigencia del ciclo de ahorro. Los intereses generados por estos
                préstamos se reinyectarán al fondo común para constituir la bolsa de rendimientos que
                se repartirá al final del ciclo.
              </p>
            </div>

            {/* 6. Retiro Anticipado y Regla de Liquidez */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="mb-1 font-semibold text-foreground">
                6. Retiro Anticipado y Regla de Liquidez
              </h3>
              <p className="mb-2">
                Cualquier Socio que solicite su retiro antes de la fecha de cierre pactada estará
                sujeto a las siguientes condiciones:
              </p>
              <div className="flex flex-col gap-1">
                <p>
                  <strong className="font-semibold">Pérdida de Rendimientos:</strong> Recibirá
                  única y exclusivamente el capital neto que haya aportado en cuotas, perdiendo todo
                  derecho sobre la bolsa de rendimientos (intereses generados por el grupo).
                </p>
                <p>
                  <strong className="font-semibold">Restricción de Liquidez:</strong> El desembolso
                  del ahorro por retiro anticipado estará estrictamente condicionado a la liquidez
                  disponible del grupo (Fondo Total - Préstamos Activos). Si el grupo no cuenta con
                  el dinero disponible debido a préstamos vigentes, el registro y pago del retiro
                  quedará congelado hasta que el fondo recupere la liquidez suficiente mediante el
                  pago de los créditos pendientes.
                </p>
              </div>
            </div>

            {/* 7. Transparencia e Inmutabilidad del Registro */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="mb-1 font-semibold text-foreground">
                7. Transparencia e Inmutabilidad del Registro
              </h3>
              <p>
                El socio acepta que el libro contable (Ledger) de la plataforma es de solo lectura
                para los Socios y de única escritura (Append-Only) para el Principal. Ningún
                registro puede ser editado o eliminado. Cualquier error cometido por el Principal será
                subsanado mediante un registro visible de "Corrección" que referenciará el error
                original, garantizando una auditoría 100% transparente y trazable para todos los
                miembros del grupo.
              </p>
            </div>
          </div>
        </ScrollArea>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
          <Checkbox
            checked={acepto}
            onCheckedChange={(v) => setAcepto(v === true)}
            aria-label="Aceptar el reglamento del fondo"
          />
          <span>
            He leído y acepto el Reglamento del Fondo y me comprometo al pago de cuotas y
            préstamos.
          </span>
        </label>

        <DialogFooter>
          <Button
            className="w-full gap-1.5 sm:w-auto"
            disabled={!acepto || enviando}
            onClick={handleIngresar}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Ingresar al Fondo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}