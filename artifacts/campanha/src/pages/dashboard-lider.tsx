import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  nivel: string;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
}

interface DashboardLider {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  regiao_nome: string | null;
  ultimos_cadastrados: Contato[];
  proximos_eventos: Evento[];
}

const nivelConfig: Record<string, { label: string; color: string; dot: string }> = {
  contato: { label: "Contato", color: "text-gray-500", dot: "bg-gray-400" },
  simpatizante: { label: "Simpatizante", color: "text-yellow-600", dot: "bg-yellow-400" },
  fechado: { label: "Fechado", color: "text-green-600", dot: "bg-green-500" },
};

export default function DashboardLiderPage() {
  const [data, setData] = useState<DashboardLider | null>(null);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    apiGet<DashboardLider>("/api/dashboard/lider")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const primeiroNome = usuario?.nome?.split(" ")[0] || "Líder";

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Olá, {primeiroNome}! 👋</h1>
          {data?.regiao_nome && <p className="text-sm text-gray-500">📍 {data.regiao_nome}</p>}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-5 mb-4 text-white shadow-lg">
              <p className="text-sm text-green-200 mb-1">Minha Base</p>
              <p className="text-7xl font-black">{data.total_contatos}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span>{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>{data.total_fechados} fechados</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Progresso (fechados)</p>
                <p className="text-sm font-bold text-green-600">
                  {data.total_contatos > 0 ? Math.round((data.total_fechados / data.total_contatos) * 100) : 0}%
                </p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${data.total_contatos > 0 ? (data.total_fechados / data.total_contatos) * 100 : 0}%` }} />
              </div>
            </div>

            <button
              onClick={() => navigate("/contatos/novo")}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-2xl p-4 text-center font-bold text-base mb-3 shadow-lg transition-all"
            >
              ➕ Cadastrar Nova Pessoa
            </button>
            <button
              onClick={() => navigate("/contatos")}
              className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl p-3.5 text-center font-semibold text-sm mb-5 shadow-sm"
            >
              👥 Ver Todos os Contatos
            </button>

            {data.ultimos_cadastrados.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🕐 Últimos Cadastrados</h2>
                <div className="space-y-1">
                  {data.ultimos_cadastrados.map((c) => {
                    const cfg = nivelConfig[c.nivel] || nivelConfig.contato;
                    return (
                      <div key={c.id} onClick={() => navigate(`/contatos/${c.id}/editar`)} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-lg px-1">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                            <p className="text-xs text-gray-400">{c.telefone} {c.bairro && `• ${c.bairro}`}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.proximos_eventos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 Próximos Eventos</h2>
                {data.proximos_eventos.map((e) => (
                  <div key={e.id} className="flex gap-3 items-start p-3 bg-green-50 rounded-xl mb-2 last:mb-0">
                    <div className="bg-green-100 rounded-lg p-1.5 min-w-[40px] text-center">
                      <p className="text-xs text-green-700 font-bold">{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                      {e.hora && <p className="text-xs text-gray-500">{e.hora.slice(0,5)} {e.local && `• ${e.local}`}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.total_contatos === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-5xl mb-3">👥</p>
                <p className="font-medium">Ainda sem cadastros</p>
                <p className="text-sm mt-1">Comece cadastrando sua primeira pessoa!</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
