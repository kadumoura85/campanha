import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type TipoUsuario = "super_admin" | "vereador" | "coordenador_geral" | "coordenador_regional" | "lider";

export interface Usuario {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: TipoUsuario;
  coordenador_id: number | null;
  regiao_id: number | null;
  bairro_regiao: string | null;
  ativo: boolean;
  created_at: string;
}

const TOKEN_KEY = "campanha_token";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

interface AuthContextValue {
  usuario: Usuario | null;
  loading: boolean;
  login: (telefone: string, senha: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsuario = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    try {
      const resp = await authFetch("/api/auth/me");
      if (resp.ok) {
        const data = await resp.json();
        setUsuario(data);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsuario(); }, [loadUsuario]);

  const login = async (telefone: string, senha: string): Promise<Usuario> => {
    const resp = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ telefone, senha }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Erro ao fazer login");
    localStorage.setItem(TOKEN_KEY, data.token);
    setUsuario(data.usuario);
    return data.usuario as Usuario;
  };

  const logout = async () => {
    await authFetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
