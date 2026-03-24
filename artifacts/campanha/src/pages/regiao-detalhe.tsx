import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Regiao {
  id: number;
  nome: string;
  descricao: string | null;
  coordenador_regional_id: number | null;
  coordenador_nome: string | null;
  cor: string;
  prioridade: "normal" | "atencao" | "prioritaria";
  observacao_estrategica: string | null;
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
  lideres: { lider_id: number | null; lider_nome: string | null; total: number; simpatizantes: number; fechados: number }[];
  observacoes: { id: number; autor_nome: string | null; observacao: string; created_at: string }[];
  proximos_eventos: { id: number; titulo: string; data: string; hora: string | null; tipo_evento: string }[];
}

const prioridadeConfig = {
  normal: { label: "Normal", color: "text-gray-600", bg: "bg-gray-100" },
  atencao: { label: "Em Atenção", color: "text-yellow-700", bg: "bg-yellow-100" },
  prioritaria: { label: "Prioritária", color: "text-red-700", bg: "bg-red-100" },
};

export default function RegiaoDetalhePage() {
  const params = useParams();
  const id = Number(params.id);
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaObs, setNovaObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [, navigate] = useLocation();
  const { usuario } = useAuth();

  const canEdit = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");

  const load = () => {
    setLoading(true);
    apiGet<Regiao>(`/api/regioes/${id}`)
      .then(setRegiao)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const changePrioridade = async (prioridade: string) => {
    await apiPatch(`/api/regioes/${id}`, { prioridade });
    load();
  };

  const addObservacao = async () => {
    if (!novaObs.trim()) return;
    setSavingObs(true);
    try {
      await apiPost(`/api/regioes/${id}/observacoes`, { observacao: novaObs });
      setNovaObs("");
      load();
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="p-4 text-center py-16">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!regiao) return (
    <Layout>
      <div className="p-4 text-center text-gray-500">Região não encontrada</div>
    </Layout>
  );

  const cfg = prioridadeConfig[regiao.prioridade];
  const pct = regiao.total_contatos > 0 ? Math.round((regiao.total_fechados / regiao.total_contatos) * 100) : 0;

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate("/regioes")} className="text-gray-400 hover:text-gray-600 p-1 -ml-1">
            ← Voltar
          </button>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: regiao.cor }} />
            <h1 className="text-2xl font-bold text-gray-900">{regiao.nome}</h1>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
        </div>

        {regiao.coordenador_nome && (
          <p className="text-sm text-gray-500 mb-4">👤 Responsável: {regiao.coordenador_nome}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Total", value: regiao.total_contatos, color: "text-blue-600" },
            { label: "Simpatiz.", value: regiao.total_simpatizantes, color: "text-yellow-600" },
            { label: "Fechados", value: regiao.total_fechados, color: "text-green-600" },
            { label: "Líderes", value: regiao.total_lideres, color: "text-purple-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Conversão */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Conversão para fechados</span>
            <span className="font-bold text-green-600">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Prioridade */}
        {canEdit && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Alterar Prioridade</p>
            <div className="flex gap-2">
              {(["normal", "atencao", "prioritaria"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => changePrioridade(p)}
                  className={`flex-1 text-xs py-2 rounded-xl font-semibold transition-all ${regiao.prioridade === p
                    ? p === "prioritaria" ? "bg-red-600 text-white" : p === "atencao" ? "bg-yellow-500 text-white" : "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {p === "normal" ? "Normal" : p === "atencao" ? "⚠️ Atenção" : "⚡ Prioritária"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ranking Líderes */}
        {regiao.lideres.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Líderes</h2>
            <div className="space-y-2">
              {regiao.lideres.map((l, i) => (
                <div key={l.lider_id ?? i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 text-gray-600"}`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{l.lider_nome || "—"}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>🟡 {l.simpatizantes}</span>
                      <span>🟢 {l.fechados}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{l.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos Eventos */}
        {regiao.proximos_eventos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 Eventos</h2>
            {regiao.proximos_eventos.map((e) => (
              <div key={e.id} className="flex gap-3 p-3 bg-blue-50 rounded-xl mb-2 last:mb-0">
                <div className="bg-blue-100 rounded-lg p-1.5 min-w-[40px] text-center">
                  <p className="text-xs text-blue-700 font-bold">{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                  {e.hora && <p className="text-xs text-gray-500">{e.hora.slice(0,5)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Observações Estratégicas */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📝 Observações Estratégicas</h2>
          {regiao.observacoes.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma observação ainda.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {regiao.observacoes.map((obs) => (
                <div key={obs.id} className="bg-blue-50 rounded-xl p-3">
                  <p className="text-sm text-gray-800">{obs.observacao}</p>
                  <p className="text-xs text-gray-400 mt-1">{obs.autor_nome} • {new Date(obs.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="mt-3">
              <textarea
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                placeholder="Adicionar observação estratégica..."
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addObservacao}
                disabled={savingObs || !novaObs.trim()}
                className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
              >
                {savingObs ? "Salvando..." : "Salvar Observação"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
