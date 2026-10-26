"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { api } from "./api";
import { invalidate, useApi } from "./hooks";

export type Me = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "teacher" | "student";
  avatarUrl: string | null;
  level: string | null;
  targetLevel: string | null;
  targetDate: string | null;
  streak: number;
  xp: number;
  permissions: string[];
};

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  isStaff: boolean;
  can: (perm: string) => boolean;
  login: (email: string, password: string) => Promise<Me>;
  register: (data: { name: string; email: string; password: string; level?: string }) => Promise<Me>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, reload } = useApi<{ user: Me | null }>("/auth/me", { dedupeMs: 60_000 });
  const user = data?.user ?? null;

  const refresh = useCallback(async () => {
    await reload();
    invalidate("/me");
  }, [reload]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      isStaff: !!user && user.role !== "student",
      can: (perm) =>
        !!user &&
        (user.role === "admin" ||
          user.permissions.includes(perm) ||
          (perm.endsWith(".read") && user.permissions.includes(perm.replace(".read", ".write")))),
      login: async (email, password) => {
        const me = await api<Me>("/auth/login", { body: { email, password } });
        await refresh();
        return me;
      },
      register: async (d) => {
        const me = await api<Me>("/auth/register", { body: d });
        await refresh();
        return me;
      },
      logout: async () => {
        await api("/auth/logout", { method: "POST" });
        await refresh();
      },
      refresh,
    }),
    [user, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return c;
}
