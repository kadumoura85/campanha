import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost, resetOfflineState } from "@/lib/api";
import { setOfflineSessionScope } from "@/lib/offline";

export type TipoUsuario =
  | "super_admin"
  | "vereador"
  | "coordenador_geral"
  | "coordenador_regional"
  | "lider";

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

const DEMO_USERS: Record<string, { tipo: TipoUsuario; nome: string }> = {
  "11999990001": { tipo: "vereador", nome: "Vereador Demo" },
  "11999990002": { tipo: "coordenador_regional", nome: "Coordenador Demo" },
  "11999990003": { tipo: "coordenador_geral", nome: "Coord. Geral Demo" },
  "11999990004": { tipo: "lider", nome: "Lider Demo" },
};

interface AuthContextValue {
  usuario: Usuario | null;
  loading: boolean;
  login: (telefone: string, senha: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const loadUsuario = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2000);

      const data = await apiGet<Usuario>("/api/auth/me", {
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);
      setUsuario(data);
      setOfflineSessionScope(String(data.id));
    } catch (error) {
      window.localStorage.removeItem(TOKEN_KEY);
      resetOfflineState();
      console.error("Erro ao carregar usuario:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsuario();
  }, [loadUsuario]);

  const login = async (telefone: string, senha: string): Promise<Usuario> => {
    try {
      const data = await apiPost<{ usuario: Usuario; token: string }>(
        "/api/auth/login",
        {
          telefone,
          senha,
        },
      );

      resetOfflineState();
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setOfflineSessionScope(String(data.usuario.id));
      setUsuario(data.usuario);
      return data.usuario;
    } catch (error: any) {
      const demo = DEMO_USERS[telefone];

      if (demo && senha === "123456") {
        const usuarioDemo: Usuario = {
          id: Number(telefone.slice(-2)),
          nome: demo.nome,
          telefone,
          email: null,
          tipo: demo.tipo,
          coordenador_id: null,
          regiao_id: null,
          bairro_regiao: null,
          ativo: true,
          created_at: new Date().toISOString(),
        };

        resetOfflineState();
        window.localStorage.setItem(TOKEN_KEY, "demo-token");
        setOfflineSessionScope(String(usuarioDemo.id));
        setUsuario(usuarioDemo);
        return usuarioDemo;
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } catch (error) {
      console.log("Logout: API nao disponivel, removendo token localmente", error);
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      resetOfflineState();
      setUsuario(null);
    }
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
