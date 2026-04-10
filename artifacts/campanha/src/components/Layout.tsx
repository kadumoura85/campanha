import { ReactNode } from "react";
import { useLocation } from "wouter";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import InstallAppButton from "@/components/InstallAppButton";
import { useAuth } from "@/hooks/useAuth";
import { useCampanha } from "@/contexts/CampanhaContext";
import { getCampaignDisplayName } from "@/lib/campanha";

interface LayoutProps {
  children: ReactNode;
}

type TipoUsuario = "super_admin" | "vereador" | "coordenador_geral" | "coordenador_regional" | "lider";

const navItems: Record<TipoUsuario, { href: string; label: string; icon: string }[]> = {
  super_admin: [
    { href: "/dashboard/vereador", label: "Dashboard", icon: "📊" },
    { href: "/regioes", label: "Bairros", icon: "🗺️" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
    { href: "/usuarios", label: "Usuários", icon: "👥" },
    { href: "/configuracao", label: "Config", icon: "⚙️" },
  ],
  vereador: [
    { href: "/dashboard/vereador", label: "Dashboard", icon: "📊" },
    { href: "/mapa", label: "Mapa Estratégico", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", icon: "👥" },
    { href: "/usuarios", label: "Equipe", icon: "🧑‍🤝‍🧑" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
  ],
  coordenador_geral: [
    { href: "/dashboard/coordenador-geral", label: "Dashboard", icon: "📊" },
    { href: "/mapa", label: "Mapa Estratégico", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", icon: "👥" },
    { href: "/usuarios", label: "Coordenadores", icon: "🧑‍🤝‍🧑" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
    { href: "/configuracao", label: "Config", icon: "⚙️" },
  ],
  coordenador_regional: [
    { href: "/dashboard/coordenador", label: "Dashboard", icon: "📊" },
    { href: "/regioes", label: "Bairros", icon: "📍" },
    { href: "/mapa", label: "Mapa Estratégico", icon: "🗺️" },
    { href: "/contatos", label: "Pessoas", icon: "👥" },
    { href: "/agenda", label: "Campo", icon: "📅" },
    { href: "/configuracao", label: "Config", icon: "⚙️" },
  ],
  lider: [
    { href: "/dashboard/lider", label: "Dashboard", icon: "🏠" },
    { href: "/contatos", label: "Pessoas", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", icon: "➕" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
  ],
};

const tipoLabel: Record<TipoUsuario, string> = {
  super_admin: "Super Admin",
  vereador: "Vereador",
  coordenador_geral: "Coord. Geral",
  coordenador_regional: "Coordenador",
  lider: "Líder",
};

export default function Layout({ children }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { config } = useCampanha();

  if (!usuario) return null;

  const tipo = usuario.tipo as TipoUsuario;
  const items = navItems[tipo] || navItems.lider;
  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";
  const campaignName = getCampaignDisplayName(config.nome_candidato);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="text-white sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
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
              <span className="font-bold text-sm leading-tight block whitespace-nowrap overflow-hidden text-ellipsis">
                {config.numero ? `${campaignName} • ${config.numero}` : campaignName}
              </span>
              {config.slogan && (
                <span className="text-[11px] text-white/80 leading-tight block whitespace-normal break-words">{config.slogan}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              <InstallAppButton variant="dark" compact />
            </div>
            <div className="text-right hidden sm:block">
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
      </header>

      <main className="flex-1 overflow-auto pb-20">{children}</main>

      <nav
        className="text-white border-t border-white/20 fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="flex items-center justify-around max-w-screen-xl mx-auto w-full">
          {items.map((item) => {
            const isDashboardLink = item.href.startsWith("/dashboard/");
            const isActive = location === item.href || (!isDashboardLink && location.startsWith(item.href));
            const compact = items.length >= 6;

            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center gap-0 flex-1 transition-all ${
                  compact ? "py-1.5 px-1" : "py-2 px-3"
                } ${isActive ? "text-white bg-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              >
                <span className={`leading-none ${compact ? "text-base" : "text-lg"}`}>{item.icon}</span>
                <span className={`font-medium mt-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
