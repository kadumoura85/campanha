import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";

interface StatsLider {
  lider_id: number | null;
  lider_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
}

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  nivel: string;
  lider_nome: string | null;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
  tipo_evento: string;
}

interface DashboardCoordenadorRegional {
  total_base: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
  regiao_nome: string | null;
  regiao_prioridade: string | null;
  ranking_lideres: StatsLider[];
  proximos_eventos: Evento[];
  ultimas_movimentacoes: Contato[];
}

const nivelConfig: Record<string, { label: string; color: string; bg: string }> = {
  contato: { label: "Contato", color: "text-gray-600", bg: "bg-gray-100" },
  simpatizante: { label: "Simpatizante", color: "text-yellow-700", bg: "bg-yellow-100" },
  fechado: { label: "Fechado", color: "text-green-700", bg: "bg-green-100" },
};

export default function DashboardCoordenadorRegionalPage() {
  const [data, setData] = useState<DashboardCoordenadorRegional | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    apiGet<DashboardCoordenadorRegional>("/api/dashboard/coordenador-regional")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Minha Região</h1>
          {data?.regiao_nome && (
            <p className="text-sm text-gray-500">📍 {data.regiao_nome}</p>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 mb-4 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-indigo-200 mb-1">Total da Minha Região</p>
                  <p className="text-6xl font-black">{data.total_base}</p>
                </div>
                {data.regiao_prioridade && data.regiao_prioridade !== "normal" && (
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${data.regiao_prioridade === "prioritaria" ? "bg-red-400 text-white" : "bg-yellow-400 text-yellow-900"}`}>
                    {data.regiao_prioridade === "prioritaria" ? "⚡ Prioritária" : "⚠️ Atenção"}
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span>{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span>{data.total_fechados} fechados</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">{data.total_lideres}</p>
                <p className="text-xs text-gray-600 mt-1">Líderes ativos</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{data.total_fechados}</p>
                <p className="text-xs text-gray-600 mt-1">Votos fechados</p>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => navigate("/contatos/novo")}
                className="bg-indigo-600 text-white rounded-2xl p-4 text-center font-semibold text-sm shadow active:scale-95 transition-transform"
              >
                ➕ Cadastrar Pessoa
              </button>
              <button
                onClick={() => navigate("/contatos")}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 text-center font-semibold text-sm shadow-sm active:scale-95 transition-transform"
              >
                👥 Ver Contatos
              </button>
            </div>

            {/* Ranking Líderes */}
            {data.ranking_lideres.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Meus Líderes</h2>
                <div className="space-y-2">
                  {data.ranking_lideres.map((l, i) => (
                    <div key={l.lider_id ?? i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 text-gray-600"}`}>{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{l.lider_nome || "—"}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>🟡 {l.simpatizantes}</span>
                          <span>🟢 {l.fechados}</span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{l.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimas movimentações */}
            {data.ultimas_movimentacoes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">🕐 Últimas Movimentações</h2>
                  <button onClick={() => navigate("/contatos")} className="text-xs text-blue-600">Ver todos →</button>
                </div>
                <div className="space-y-2">
                  {data.ultimas_movimentacoes.map((c) => {
                    const cfg = nivelConfig[c.nivel] || nivelConfig.contato;
                    return (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                          <p className="text-xs text-gray-400">{c.lider_nome && `Líder: ${c.lider_nome}`} {c.bairro && `• ${c.bairro}`}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Próximos Eventos */}
            {data.proximos_eventos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">📅 Próximos Eventos</h2>
                  <button onClick={() => navigate("/agenda")} className="text-xs text-blue-600">Ver →</button>
                </div>
                <div className="space-y-2">
                  {data.proximos_eventos.map((e) => (
                    <div key={e.id} className="flex gap-3 items-start p-3 bg-indigo-50 rounded-xl">
                      <div className="bg-indigo-100 rounded-lg p-1.5 min-w-[40px] text-center">
                        <p className="text-xs text-indigo-700 font-bold">{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                        {e.hora && <p className="text-xs text-gray-500">{e.hora.slice(0,5)} {e.local && `• ${e.local}`}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
