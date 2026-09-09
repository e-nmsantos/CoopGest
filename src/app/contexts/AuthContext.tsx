import { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";

interface User {
  id: number;
  username: string;
  nome: string;
  papel: "admin" | "membro";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_BOOTSTRAP_TIMEOUT_MS = 10000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AUTH_BOOTSTRAP_TIMEOUT_MS);

    apiGet<User | null>("/api/auth/me", { signal: controller.signal })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiPost<User>("/api/auth/login", { username, password });
    setUser(data);
  };

  const logout = async () => {
    await apiPost<null>("/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
