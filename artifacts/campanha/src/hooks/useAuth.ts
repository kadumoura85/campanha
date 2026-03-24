import { useState, useEffect, useCallback } from "react";

export type TipoUsuario = "vereador" | "coordenador" | "lider";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  coordenador_id: number | null;
  bairro_regiao: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
}

const TOKEN_KEY = "campanha_token";
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const authFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  }, []);

  const loadUsuario = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
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
  }, [authFetch]);

  useEffect(() => {
    loadUsuario();
  }, [loadUsuario]);

  const login = async (telefone: string, senha: string) => {
    const resp = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ telefone, senha }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || "Erro ao fazer login");
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setUsuario(data.usuario);
    return data.usuario as Usuario;
  };

  const logout = async () => {
    await authFetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  };

  return { usuario, loading, login, logout, authFetch, getToken };
}
