'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { CrearGrupoForm, GrupoInfo, ConfigurarSociosForm } from '@/features/grupo';
import { useMockStore } from '@/mocks';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Users, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { isPrincipal, socio } = useSession();
  const grupo = useMockStore((s) => s.grupo);
  const getSociosPorGrupo = useMockStore((s) => s.getSociosPorGrupo);
  const router = useRouter();

  const socios = grupo ? getSociosPorGrupo(grupo.id) : [];
  const haySocios = socios.length > 0;

  useEffect(() => {
    if (grupo && haySocios) {
      router.replace(`/dashboard/grupos/${grupo.id}`);
    }
  }, [grupo, haySocios, router]);

  if (grupo && haySocios) {
    return null;
  }

  // ── Socio ──
  if (!isPrincipal) {
    if (!grupo) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            eyebrow="Fondo de ahorro"
            title="Dashboard"
            description={`Bienvenido, ${socio?.nombre ?? socio?.id ?? ''}`}
          />
          <EmptyState
            icon={<Users className="size-10" />}
            title="Aún no se ha creado el grupo"
            description="Espera a que el principal configure el fondo de ahorro comunal."
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Fondo de ahorro"
          title="Dashboard"
          description={`Bienvenido, ${socio?.nombre ?? socio?.id ?? ''}`}
        />
        <GrupoInfo grupo={grupo} />
        <EmptyState
          icon={<Settings className="size-10" />}
          title="Configuración en progreso"
          description="El principal está configurando los socios del grupo. Espera a que finalice."
        />
      </div>
    );
  }

  // ── Principal ──
  if (!grupo) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Configuración"
          title="Crear nuevo grupo"
          description="Configura las reglas iniciales de tu fondo de ahorro comunal."
        />
        <CrearGrupoForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={grupo.nombre}
        title="Configurar socios"
        description="Define la membresía y las cuotas de cada integrante del grupo."
      />
      <GrupoInfo grupo={grupo} />
      <ConfigurarSociosForm grupo={grupo} />
    </div>
  );
}