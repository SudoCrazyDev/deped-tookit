import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import type { Teacher } from "./types";

type AuthState = {
  teacher: Teacher | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ teacher: Teacher }>("/auth/me")
      .then((r) => setTeacher(r.teacher))
      .catch((err) => {
        // A 401 here just means "not signed in" — not an error worth surfacing.
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
        setTeacher(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ teacher: Teacher }>("/auth/login", { email, password });
    setTeacher(r.teacher);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout", {});
    setTeacher(null);
  }, []);

  return <AuthContext value={{ teacher, loading, login, logout }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
