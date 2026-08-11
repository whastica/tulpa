'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import type { RolUsuario, Sesion, Socio } from '@/types';
import { useMockStore } from '@/mocks';

// ──────────────────────────────────────────────
// Store de sesión (Zustand + localStorage)
// ──────────────────────────────────────────────

type SessionStore = {
  session: Sesion | null;
  hydrated: boolean;
  login: (rol: RolUsuario, socioId?: string) => void;
  logout: () => void;
  hydrate: () => void;
};

const STORAGE_KEY = 'tulpa-session';

function leerSesionStorage(): Sesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

function guardarSesionStorage(sesion: Sesion | null) {
  if (typeof window === 'undefined') return;
  if (sesion) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  hydrated: false,

  hydrate: () => {
    const sesion = leerSesionStorage();
    set({ session: sesion, hydrated: true });
  },

  login: (rol, socioId) => {
    const userId = rol === 'principal' ? 'user-001' : socioId?.replace('socio-', 'user-') ?? '';
    const sesion: Sesion = {
      userId,
      rol,
      socioId: rol === 'socio' ? (socioId ?? null) : null,
    };
    guardarSesionStorage(sesion);
    set({ session: sesion });
  },

  logout: () => {
    guardarSesionStorage(null);
    set({ session: null });
  },
}));

// ──────────────────────────────────────────────
// Contexto React
// ──────────────────────────────────────────────

type SessionContextValue = {
  isAuthenticated: boolean;
  isPrincipal: boolean;
  isSocio: boolean;
  session: Sesion | null;
  socio: Socio | null;
  hydrated: boolean;
  login: (rol: RolUsuario, socioId?: string) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSessionStore((s) => s.session);
  const hydrated = useSessionStore((s) => s.hydrated);
  const login = useSessionStore((s) => s.login);
  const logout = useSessionStore((s) => s.logout);
  const hydrate = useSessionStore((s) => s.hydrate);

  const getSocioPorId = useMockStore((s) => s.getSocioPorId);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const socio = session?.socioId ? getSocioPorId(session.socioId) ?? null : null;

  const value: SessionContextValue = {
    isAuthenticated: !!session,
    isPrincipal: session?.rol === 'principal',
    isSocio: session?.rol === 'socio',
    session,
    socio,
    hydrated,
    login,
    logout,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return ctx;
}
