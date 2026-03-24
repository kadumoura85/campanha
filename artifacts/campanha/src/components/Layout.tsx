import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
}

type TipoUsuario = "super_admin" | "vereador" | "coordenador_geral" | "coordenador_regional" | "lider";

const navItems: Record<TipoUsuario, { href: string; label: string; icon: string }[]> = {
  super_admin: [
    { href: "/dashboard/vereador", label: "Dashboard", icon: "📊" },
    { href: "/regioes", label: "Regiões", icon: "🗺️" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
    { href: "/usuarios", label: "Usuários", icon: "👥" },
    { href: "/configuracao", label: "Config", icon: "⚙️" },
  ],
  vereador: [
    { href: "/dashboard/vereador", label: "Dashboard", icon: "📊" },
    { href: "/mapa", label: "Mapa", icon: "🗺️" },
    { href: "/regioes", label: "Regiões", icon: "📍" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
  ],
  coordenador_geral: [
    { href: "/dashboard/coordenador-geral", label: "Dashboard", icon: "📊" },
    { href: "/regioes", label: "Regiões", icon: "📍" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
  ],
  coordenador_regional: [
    { href: "/dashboard/coordenador-regional", label: "Dashboard", icon: "📊" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", icon: "➕" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
  ],
  lider: [
    { href: "/dashboard/lider", label: "Dashboard", icon: "🏠" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", icon: "➕" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
  ],
};

const tipoLabel: Record<TipoUsuario, string> = {
  super_admin: "Super Admin",
  vereador: "Vereador",
  coordenador_geral: "Coord. Geral",
  coordenador_regional: "Coord. Regional",
  lider: "Líder",
};

export default function Layout({ children }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!usuario) return null;

  const tipo = usuario.tipo as TipoUsuario;
  const items = navItems[tipo] || navItems["lider"];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-base">🏛️</span>
            </div>
            <div>
              <span className="font-bold text-sm">Campanha</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{usuario.nome.split(" ")[0]}</p>
              <p className="text-xs text-blue-200">{tipoLabel[tipo]}</p>
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

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-blue-700 text-white border-t border-blue-600 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="flex items-center justify-around max-w-screen-xl mx-auto">
          {items.map((item) => {
            const isActive = location.startsWith(item.href) && item.href !== "/" || location === item.href;
            const active = location === item.href || (item.href !== "/dashboard/vereador" && item.href !== "/dashboard/coordenador-geral" && item.href !== "/dashboard/coordenador-regional" && item.href !== "/dashboard/lider" && location.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-all ${
                  isActive
                    ? "text-white bg-white/20"
                    : "text-blue-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-xs font-medium mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
