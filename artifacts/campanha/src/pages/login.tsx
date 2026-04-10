import { useState } from "react";
import { useLocation } from "wouter";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import InstallAppButton from "@/components/InstallAppButton";
import { useCampanha } from "@/contexts/CampanhaContext";
import { useAuth } from "@/hooks/useAuth";
import { getCampaignDisplayName } from "@/lib/campanha";
import { getDashboardPath } from "@/lib/dashboard-path";

export default function LoginPage() {
  const { login } = useAuth();
  const { config } = useCampanha();
  const [, navigate] = useLocation();
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";
  const campaignName = getCampaignDisplayName(config.nome_candidato);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const usuario = await login(telefone, senha);
      navigate(getDashboardPath(usuario.tipo));
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (tel: string) => {
    setTelefone(tel);
    setSenha("123456");
  };

  const demoAccounts = [
    { tel: "11999990001", label: "Vereador", icon: "🏛️" },
    { tel: "11999990002", label: "Coordenador", icon: "📍" },
    { tel: "11999990003", label: "Coord. Geral", icon: "📋" },
    { tel: "11999990004", label: "Líder", icon: "👤" },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-start sm:items-center justify-center px-4 py-6 sm:py-8"
      style={{ background: `linear-gradient(135deg, ${primary}ee, ${secondary})` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-24 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-5 sm:mb-6">
          <CampanhaAvatar
            nome={campaignName}
            logo={config.logo}
            foto={config.foto_principal}
            alt={campaignName}
            className="inline-flex w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-xl mb-4 border-4 border-white/30"
            fallbackClassName="items-center justify-center bg-white/10 backdrop-blur"
            textClassName="text-2xl font-black text-white"
          />

          <h1 className="text-2xl sm:text-3xl font-bold text-white">{campaignName}</h1>

          {config.numero && (
            <div className="inline-block bg-white/20 backdrop-blur text-white font-bold px-4 py-1 rounded-full text-sm mt-1.5">
              Número {config.numero}
            </div>
          )}

          {config.slogan ? (
            <p className="text-white/90 text-sm sm:text-base mt-2 max-w-sm mx-auto leading-relaxed">
              {config.slogan}
            </p>
          ) : (
            <p className="text-white/75 text-sm mt-2">Sistema de gestão eleitoral</p>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[28px] shadow-2xl border border-white/20 p-5 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-shadow"
                style={{ "--tw-ring-color": primary } as any}
                placeholder="(11) 99999-9999"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-shadow"
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <InstallAppButton />
          </form>

          <div className="mt-5 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.tel}
                  onClick={() => fillDemo(demo.tel)}
                  className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-100 px-2.5 py-1.5 transition-colors text-left"
                >
                  <span className="shrink-0">{demo.icon}</span>
                  <span className="whitespace-nowrap">{demo.tel} ({demo.label})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
