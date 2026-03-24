import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/App";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Campanha Política</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de gestão eleitoral</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Entrar no sistema</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-2 font-medium">Acesso de demonstração</p>
            <div className="grid grid-cols-1 gap-1">
              {[
                { tel: "11999990001", label: "Vereador", icon: "🏛️" },
                { tel: "11999990002", label: "Coord. Regional", icon: "📍" },
                { tel: "11999990003", label: "Coord. Geral", icon: "📋" },
                { tel: "11999990004", label: "Líder", icon: "👤" },
              ].map(d => (
                <button key={d.tel} onClick={() => fillDemo(d.tel)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors text-left">
                  <span>{d.icon}</span>
                  <span>{d.tel} ({d.label})</span>
                </button>
              ))}
              <p className="text-xs text-gray-400 mt-1 px-2">Senha: 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
