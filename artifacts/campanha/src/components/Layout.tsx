import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useCampanha } from "@/contexts/CampanhaContext";
import {
  OFFLINE_QUEUE_CHANGED_EVENT,
  OFFLINE_SYNC_COMPLETE_EVENT,
  getOfflineQueueSize,
} from "@/lib/offline";
import { getCampaignDisplayName } from "@/lib/campanha";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface LayoutProps {
  children: ReactNode;
}

type TipoUsuario =
  | "super_admin"
  | "vereador"
  | "coordenador_geral"
  | "coordenador_regional"
  | "lider";

const navItems: Record<
  TipoUsuario,
  { href: string; label: string; mobileLabel: string; icon: string }[]
> = {
  super_admin: [
    { href: "/dashboard/vereador", label: "Dashboard", mobileLabel: "Inicio", icon: "🏠" },
    { href: "/regioes", label: "Bairros", mobileLabel: "Bairros", icon: "🗺️" },
    { href: "/agenda", label: "Agenda", mobileLabel: "Agenda", icon: "📅" },
    { href: "/usuarios", label: "Usuarios", mobileLabel: "Equipe", icon: "👥" },
    { href: "/configuracao", label: "Config", mobileLabel: "Config", icon: "⚙️" },
  ],
  vereador: [
    { href: "/dashboard/vereador", label: "Dashboard", mobileLabel: "Inicio", icon: "🏠" },
    { href: "/mapa", label: "Mapa Estrategico", mobileLabel: "Mapa", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", mobileLabel: "Pessoas", icon: "👥" },
    { href: "/usuarios", label: "Equipe", mobileLabel: "Equipe", icon: "🧑‍🤝‍🧑" },
    { href: "/agenda", label: "Agenda", mobileLabel: "Agenda", icon: "📅" },
  ],
  coordenador_geral: [
    { href: "/dashboard/coordenador-geral", label: "Dashboard", mobileLabel: "Inicio", icon: "🏠" },
    { href: "/mapa", label: "Mapa Estrategico", mobileLabel: "Mapa", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", mobileLabel: "Pessoas", icon: "👥" },
    { href: "/usuarios", label: "Coordenadores", mobileLabel: "Equipe", icon: "🧑‍🤝‍🧑" },
    { href: "/agenda", label: "Agenda", mobileLabel: "Agenda", icon: "📅" },
  ],
  coordenador_regional: [
    { href: "/dashboard/coordenador", label: "Dashboard", mobileLabel: "Inicio", icon: "🏠" },
    { href: "/regioes", label: "Bairros", mobileLabel: "Bairro", icon: "📍" },
    { href: "/mapa", label: "Mapa Estrategico", mobileLabel: "Mapa", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", mobileLabel: "Pessoas", icon: "👥" },
    { href: "/agenda", label: "Campo", mobileLabel: "Agenda", icon: "📅" },
  ],
  lider: [
    { href: "/dashboard/lider", label: "Dashboard", mobileLabel: "Inicio", icon: "🏠" },
    { href: "/contatos", label: "Pessoas", mobileLabel: "Pessoas", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", mobileLabel: "Novo", icon: "➕" },
    { href: "/agenda", label: "Agenda", mobileLabel: "Agenda", icon: "📅" },
  ],
};

const tipoLabel: Record<TipoUsuario, string> = {
  super_admin: "Super Admin",
  vereador: "Vereador",
  coordenador_geral: "Coord. Geral",
  coordenador_regional: "Coordenador",
  lider: "Lider",
};

export default function Layout({ children }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { config } = useCampanha();
  const { isOnline } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  if (!usuario) return null;

  const tipo = usuario.tipo as TipoUsuario;
  const items = navItems[tipo] || navItems.lider;
  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";
  const campaignName = getCampaignDisplayName(config.nome_candidato);
  const canAccessConfig = tipo === "coordenador_geral" || tipo === "super_admin";

  useEffect(() => {
    const updateQueueSize = () => setPendingSyncCount(getOfflineQueueSize());

    updateQueueSize();
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, updateQueueSize);
    window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, updateQueueSize);

    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, updateQueueSize);
      window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, updateQueueSize);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        className="text-white sticky top-0 z-50 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CampanhaAvatar
              nome={campaignName}
              logo={config.logo}
              foto={config.foto_principal}
              alt={campaignName}
              className="w-8 h-8 rounded-full object-cover"
              fallbackClassName="bg-white/20 flex items-center justify-center"
              textClassName="text-[11px] font-bold text-white"
            />
            <div className="min-w-0">
              <span className="font-bold text-sm leading-tight block truncate">
                {config.numero ? `${campaignName} · ${config.numero}` : campaignName}
              </span>
              {config.slogan && (
                <span className="text-[11px] text-white/80 leading-tight block line-clamp-2">
                  {config.slogan}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canAccessConfig && (
              <button
                onClick={() => navigate("/configuracao")}
                className="text-xs bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
              >
                Config
              </button>
            )}
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-white">{usuario.nome.split(" ")[0]}</p>
              <p className="text-xs text-white/70">{tipoLabel[tipo]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Sair
            </button>
          </div>
        </div>

        {(!isOnline || pendingSyncCount > 0) && (
          <div className="border-t border-white/15 bg-black/10 px-4 py-2 text-[11px] text-white/90">
            <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
              <span>
                {!isOnline
                  ? "Sem internet. Voce pode continuar e o sistema tenta sincronizar depois."
                  : pendingSyncCount === 1
                    ? "1 alteracao ainda esta pendente de sincronizacao."
                    : `${pendingSyncCount} alteracoes ainda estao pendentes de sincronizacao.`}
              </span>
              {pendingSyncCount > 0 && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                  {pendingSyncCount} pendente{pendingSyncCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto pb-20">{children}</main>

      <nav
        className="text-white border-t border-white/20 fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="flex items-center justify-around max-w-screen-xl mx-auto w-full">
          {items.map((item) => {
            const isDashboardLink = item.href.startsWith("/dashboard/");
            const isActive =
              location === item.href ||
              (!isDashboardLink && location.startsWith(item.href));

            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center gap-0 flex-1 py-2 px-2 transition-all ${
                  isActive
                    ? "text-white bg-white/20"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="leading-none text-lg">{item.icon}</span>
                <span className="font-medium mt-0.5 text-[11px]">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
