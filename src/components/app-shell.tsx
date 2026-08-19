'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Landmark,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useSession } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const APP_NAME = 'Tulpa';
const APP_TAGLINE = 'Fondo de Ahorro y Crédito Comunal';

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  principalOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Panel',
    description: 'Resumen del grupo',
    icon: LayoutDashboard,
  },
  {
    href: '/admin',
    label: 'Administración',
    description: 'Operaciones del fondo',
    icon: Settings,
    principalOnly: true,
  },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
        <Landmark className="size-5" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {APP_TAGLINE}
        </span>
      </div>
    </div>
  );
}

function initialsFor(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'P';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPrincipal, logout, socio } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS.filter((item) => !item.principalOnly || isPrincipal);

  const userLabel = isPrincipal
    ? 'Principal'
    : (socio?.nombre ?? 'Socio');
  const userSub = isPrincipal
    ? 'Administrador del fondo'
    : (socio?.user_id ?? 'Miembro del grupo');
  const userInitials = isPrincipal ? 'P' : initialsFor(userLabel);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  function renderNavItem({ href, label, description, icon: Icon }: NavItem) {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'size-4 shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-col">
          <span>{label}</span>
          <span className="hidden truncate text-[11px] font-normal text-muted-foreground lg:block">
            {description}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div className="lg:flex lg:min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-5 py-6">
          <Brand />
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3"
          aria-label="Navegación principal"
        >
          {navItems.map(renderNavItem)}
        </nav>

        <div className="p-4">
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                aria-hidden="true"
              >
                {userInitials}
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {userLabel}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {userSub}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-2"
              onClick={handleLogout}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </Button>
            <Brand />
          </div>
          <ThemeToggle />
        </div>

        {mobileOpen && (
          <nav
            className="flex flex-col gap-1 border-t border-border bg-card px-3 py-3"
            aria-label="Navegación principal"
          >
            {navItems.map(renderNavItem)}
            <div className="my-1 h-px bg-border" role="separator" />
            <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  aria-hidden="true"
                >
                  {userInitials}
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {userLabel}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userSub}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Salir
              </Button>
            </div>
          </nav>
        )}
      </header>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {APP_NAME} · {APP_TAGLINE}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}