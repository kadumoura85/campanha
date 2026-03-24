import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface CampanhaConfig {
  nome_candidato: string;
  foto_principal: string | null;
  slogan: string | null;
  numero: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  logo: string | null;
  frase_institucional: string | null;
  musica_url: string | null;
  descricao_curta: string | null;
}

interface CampanhaContextType {
  config: CampanhaConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: CampanhaConfig = {
  nome_candidato: "Campanha Política",
  foto_principal: null,
  slogan: null,
  numero: null,
  cor_primaria: "#1d4ed8",
  cor_secundaria: "#1e40af",
  logo: null,
  frase_institucional: null,
  musica_url: null,
  descricao_curta: null,
};

const CampanhaContext = createContext<CampanhaContextType>({
  config: DEFAULT_CONFIG,
  loading: true,
  refresh: async () => {},
});

function applyTheme(config: CampanhaConfig) {
  document.documentElement.style.setProperty("--campaign-primary", config.cor_primaria || "#1d4ed8");
  document.documentElement.style.setProperty("--campaign-secondary", config.cor_secundaria || "#1e40af");
}

export function CampanhaProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CampanhaConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${base}/api/config/public`);
      if (res.ok) {
        const data: CampanhaConfig = await res.json();
        setConfig(data);
        applyTheme(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return (
    <CampanhaContext.Provider value={{ config, loading, refresh: fetchConfig }}>
      {children}
    </CampanhaContext.Provider>
  );
}

export function useCampanha() {
  return useContext(CampanhaContext);
}
