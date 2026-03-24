import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth, TipoUsuario } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
}

const navItems: Record<TipoUsuario, { href: string; label: string; icon: string }[]> = {
  vereador: [
    { href: "/dashboard/vereador", label: "Dashboard", icon: "📊" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/usuarios", label: "Usuários", icon: "⚙️" },
  ],
  coordenador: [
    { href: "/dashboard/coordenador", label: "Dashboard", icon: "📊" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", icon: "➕" },
  ],
  lider: [
    { href: "/dashboard/lider", label: "Dashboard", icon: "📊" },
    { href: "/contatos", label: "Contatos", icon: "👥" },
    { href: "/contatos/novo", label: "Cadastrar", icon: "➕" },
  ],
};

const tipoLabel: Record<TipoUsuario, string> = {
  vereador: "Vereador",
  coordenador: "Coordenador",
  lider: "Líder",
};

export default function Layout({ children }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!usuario) return null;

  const items = navItems[usuario.tipo] || [];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-bold text-sm">Campanha</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-blue-100">{usuario.nome}</p>
              <p className="text-xs text-blue-300">{tipoLabel[usuario.tipo]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-sidebar text-sidebar-foreground border-t border-sidebar-border sticky bottom-0 z-50 shadow-lg">
        <div className="flex items-center justify-around">
          {items.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center gap-0.5 py-2 px-4 flex-1 transition-colors ${
                  isActive
                    ? "text-white bg-white/15"
                    : "text-blue-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
