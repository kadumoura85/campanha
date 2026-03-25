import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface RegiaoComStats {
  id: number;
  nome: string;
  descricao: string | null;
  coordenador_nome: string | null;
  cor: string;
  prioridade: "normal" | "atencao" | "prioritaria";
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
  observacao_estrategica: string | null;
}

interface Observacao {
  id: number;
  observacao: string;
  autor_nome: string | null;
  created_at: string;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
  tipo_evento: string;
}

interface RegiaoDetalhe extends RegiaoComStats {
  observacoes: Observacao[];
  proximos_eventos: Evento[];
}

type FiltroForça = "todos" | "forte" | "media" | "fraca" | "prioritaria";

function getRegStrength(r: RegiaoComStats): "forte" | "media" | "fraca" | "prioritaria" {
  if (r.prioridade === "prioritaria") return "prioritaria";
  if (r.total_contatos === 0) return "fraca";
  const pct = r.total_fechados / r.total_contatos;
  if (pct >= 0.3) return "forte";
  if (pct >= 0.1) return "media";
  return "fraca";
}

const strengthConfig = {
  forte:      { color: "#10B981", label: "Forte",      bg: "bg-green-50  border-green-200",  pill: "bg-green-100 text-green-700" },
  media:      { color: "#F59E0B", label: "Média",      bg: "bg-yellow-50 border-yellow-200", pill: "bg-yellow-100 text-yellow-700" },
  fraca:      { color: "#EF4444", label: "Fraca",      bg: "bg-red-50    border-red-200",    pill: "bg-red-100 text-red-700" },
  prioritaria:{ color: "#3B82F6", label: "Prioritária",bg: "bg-blue-50   border-blue-200",   pill: "bg-blue-100 text-blue-700" },
};

const tipoEventoEmoji: Record<string, string> = {
  reuniao: "🤝", caminhada: "🚶", visita: "🏠",
  comicio: "🎤", acao_de_rua: "📢", evento_interno: "🏛️",
};

const PRIORIDADES = [
  { value: "normal",      label: "Normal",       color: "bg-gray-600 text-white" },
  { value: "atencao",     label: "⚠️ Atenção",   color: "bg-yellow-500 text-white" },
  { value: "prioritaria", label: "⚡ Prioritária", color: "bg-red-600 text-white" },
];

export default function MapaPage() {
  const [regioes, setRegioes] = useState<RegiaoComStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RegiaoComStats | null>(null);
  const [detalhe, setDetalhe] = useState<RegiaoDetalhe | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [filtro, setFiltro] = useState<FiltroForça>("todos");
  const [changingPriority, setChangingPriority] = useState(false);
  const [, navigate] = useLocation();
  const { usuario } = useAuth();

  const canEdit = ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "");

  const loadRegioes = () =>
    apiGet<RegiaoComStats[]>("/api/regioes").then(setRegioes).finally(() => setLoading(false));

  useEffect(() => { loadRegioes(); }, []);

  const handleSelect = async (r: RegiaoComStats) => {
    if (selected?.id === r.id) { setSelected(null); setDetalhe(null); return; }
    setSelected(r);
    setDetalhe(null);
    setLoadingDetalhe(true);
    try {
      const det = await apiGet<RegiaoDetalhe>(`/api/regioes/${r.id}`);
      setDetalhe(det);
    } catch {}
    setLoadingDetalhe(false);
  };

  const changePrioridade = async (prioridade: string) => {
    if (!selected) return;
    setChangingPriority(true);
    try {
      await apiPatch(`/api/regioes/${selected.id}`, { prioridade });
      await loadRegioes();
      setSelected(prev => prev ? { ...prev, prioridade: prioridade as any } : null);
      if (detalhe) setDetalhe(prev => prev ? { ...prev, prioridade: prioridade as any } : null);
    } finally {
      setChangingPriority(false);
    }
  };

  const filtroTabs: { value: FiltroForça; label: string; count: number }[] = [
    { value: "todos", label: "Todas", count: regioes.length },
    { value: "prioritaria", label: "⚡ Prior.", count: regioes.filter(r => getRegStrength(r) === "prioritaria").length },
    { value: "fraca", label: "🔴 Fracas", count: regioes.filter(r => getRegStrength(r) === "fraca").length },
    { value: "media", label: "🟡 Médias", count: regioes.filter(r => getRegStrength(r) === "media").length },
    { value: "forte", label: "🟢 Fortes", count: regioes.filter(r => getRegStrength(r) === "forte").length },
  ];

  const regioesFiltradas = filtro === "todos" ? regioes : regioes.filter(r => getRegStrength(r) === filtro);

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mapa Estratégico</h1>
          <p className="text-sm text-gray-500">{regioes.length} regiões da campanha</p>
        </div>

        {/* Filtro tabs */}
        {!loading && regioes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {filtroTabs.map(t => (
              <button key={t.value}
                onClick={() => setFiltro(t.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filtro === t.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t.label} {t.count > 0 && <span className="ml-1 opacity-70">({t.count})</span>}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Grid de regiões */}
        {!loading && (
          <>
            {regioesFiltradas.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">🗺️</p>
                <p className="text-sm">Nenhuma região nessa categoria</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {regioesFiltradas.map(r => {
                const strength = getRegStrength(r);
                const cfg = strengthConfig[strength];
                const pct = r.total_contatos > 0 ? Math.round((r.total_fechados / r.total_contatos) * 100) : 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className={`rounded-2xl p-4 border cursor-pointer transition-all active:scale-95 ${selected?.id === r.id ? "ring-2 ring-blue-500 " : ""} ${cfg.bg}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: cfg.color }} />
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-1 leading-tight">{r.nome}</p>
                    <p className="text-2xl font-black text-gray-800">{r.total_contatos}</p>
                    <p className="text-xs text-gray-500">contatos • {pct}% fechados</p>
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Painel da região selecionada */}
            {selected && (
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-lg">{selected.nome}</h3>
                  <button onClick={() => { setSelected(null); setDetalhe(null); }}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
                </div>

                {selected.coordenador_nome && (
                  <p className="text-sm text-gray-500 mb-3">👤 {selected.coordenador_nome}</p>
                )}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selected.total_contatos}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selected.total_fechados}</p>
                    <p className="text-xs text-gray-500">Fechados</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{selected.total_simpatizantes}</p>
                    <p className="text-xs text-gray-500">Simpatizantes</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{selected.total_lideres}</p>
                    <p className="text-xs text-gray-500">Líderes</p>
                  </div>
                </div>

                {/* Quick priority change for authorized users */}
                {canEdit && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-semibold mb-1.5">Prioridade</p>
                    <div className="flex gap-1.5">
                      {PRIORIDADES.map(p => (
                        <button key={p.value}
                          onClick={() => changePrioridade(p.value)}
                          disabled={changingPriority}
                          className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 ${selected.prioridade === p.value ? p.color : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loadingDetalhe && (
                  <div className="text-center py-2">
                    <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {detalhe && (
                  <>
                    {(detalhe.observacao_estrategica || detalhe.observacoes.length > 0) && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">📋 Observações</p>
                        {detalhe.observacao_estrategica && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 mb-1.5">
                            {detalhe.observacao_estrategica}
                          </div>
                        )}
                        {detalhe.observacoes.slice(0, 2).map(obs => (
                          <div key={obs.id} className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-700 mb-1">
                            <p>{obs.observacao}</p>
                            <p className="text-gray-400 mt-0.5">— {obs.autor_nome} • {new Date(obs.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {detalhe.proximos_eventos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">📅 Próximos Eventos</p>
                        <div className="space-y-1">
                          {detalhe.proximos_eventos.map(ev => (
                            <div key={ev.id} className="flex items-center gap-2 bg-blue-50 rounded-xl p-2 text-xs">
                              <span>{tipoEventoEmoji[ev.tipo_evento] || "📅"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{ev.titulo}</p>
                                <p className="text-gray-500">{new Date(ev.data + "T12:00:00").toLocaleDateString("pt-BR")} {ev.hora && `• ${ev.hora.slice(0,5)}`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button onClick={() => navigate(`/regioes/${selected.id}`)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
                  Ver detalhes completos →
                </button>
              </div>
            )}

            {/* Ranking */}
            {regioes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Ranking Geral</h2>
                <div className="space-y-2">
                  {[...regioes].sort((a, b) => b.total_contatos - a.total_contatos).map((r, i) => {
                    const strength = getRegStrength(r);
                    const cfg = strengthConfig[strength];
                    const max = regioes[0]?.total_contatos || 1;
                    return (
                      <div key={r.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/regioes/${r.id}`)}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-gray-100 text-gray-600"}`}>{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-800">{r.nome}</p>
                            <span className="text-xs font-semibold text-gray-500">{r.total_contatos}</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full" style={{ width: `${(r.total_contatos / max) * 100}%`, backgroundColor: cfg.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {regioes.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🗺️</p>
            <p>Nenhuma região cadastrada ainda</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
