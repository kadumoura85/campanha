import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";

interface StatsRegiao {
  regiao_id: number | null;
  regiao_nome: string | null;
  cor: string | null;
  prioridade: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
  lideres: number;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
  tipo_evento: string;
  criado_por_nome: string | null;
}

interface StatsLider {
  lider_id: number | null;
  lider_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
}

interface DashboardVereador {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_coordenadores: number;
  total_lideres: number;
  total_regioes: number;
  crescimento_semana: number;
  por_regiao: StatsRegiao[];
  proximos_eventos: Evento[];
  ranking_lideres: StatsLider[];
  alertas: string[];
}

function getForca(regiao: StatsRegiao): "forte" | "media" | "fraca" {
  if (regiao.total === 0) return "fraca";
  const pct = (regiao.fechados / regiao.total) * 100;
  if (pct >= 20) return "forte";
  if (pct >= 10) return "media";
  return "fraca";
}

const forcaConfig = {
  forte: { label: "Forte",   bg: "bg-green-50",  border: "border-green-200", dot: "bg-green-500",  text: "text-green-700",  bar: "#22c55e" },
  media: { label: "Média",   bg: "bg-yellow-50", border: "border-yellow-200",dot: "bg-yellow-400", text: "text-yellow-700", bar: "#eab308" },
  fraca: { label: "Fraca",   bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500",    text: "text-red-700",    bar: "#ef4444" },
};

export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardVereador | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiGet<DashboardVereador>("/api/dashboard/vereador")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const toggleMusic = () => {
    if (!config.musica_url) return;
    if (!audioEl) {
      const audio = new Audio(config.musica_url);
      audio.loop = true;
      audio.play();
      setAudioEl(audio);
      setMusicPlaying(true);
    } else {
      if (musicPlaying) { audioEl.pause(); setMusicPlaying(false); }
      else { audioEl.play(); setMusicPlaying(true); }
    }
  };

  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";

  const regioesOrdenadas = data ? [...data.por_regiao].sort((a, b) => {
    const ordem = { fraca: 0, media: 1, forte: 2 };
    return ordem[getForca(a)] - ordem[getForca(b)];
  }) : [];

  const regioesPrioritarias = data?.por_regiao.filter(r => r.prioridade === "prioritaria" || r.prioridade === "atencao") || [];
  const regioesFracas = regioesOrdenadas.filter(r => getForca(r) === "fraca" && r.prioridade !== "prioritaria");
  const alertasVisuais = [
    ...data?.alertas || [],
    ...regioesFracas.length > 0 ? [`${regioesFracas.length} região(ões) com baixa atividade`] : [],
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <Layout>
      <div className="p-4 max-w-xl mx-auto">

        {/* ── TOPO: Candidato ─────────────────────────────────────── */}
        <div className="rounded-2xl p-4 mb-4 text-white shadow-lg relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-3">
            {config.foto_principal ? (
              <img src={config.foto_principal} alt={config.nome_candidato}
                className="w-14 h-14 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🏛️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black truncate leading-tight">{config.nome_candidato}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {config.numero && (
                  <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Nº {config.numero}
                  </span>
                )}
                {config.slogan && (
                  <p className="text-xs text-white/70 italic truncate">"{config.slogan}"</p>
                )}
              </div>
            </div>
            {config.musica_url && (
              <button onClick={toggleMusic}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <span>{musicPlaying ? "⏸️" : "🎵"}</span>
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: primary, borderTopColor: "transparent" }} />
            <p className="text-sm text-gray-400 mt-3">Carregando...</p>
          </div>
        )}

        {data && (
          <>
            {/* ── ALERTAS IMPORTANTES ─────────────────────────────── */}
            {alertasVisuais.length > 0 && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-orange-200 shadow-sm">
                <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <span className="text-white text-sm font-bold">Requer sua atenção</span>
                </div>
                <div className="bg-orange-50 divide-y divide-orange-100">
                  {alertasVisuais.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-sm text-orange-900">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── NÚMERO PRINCIPAL ────────────────────────────────── */}
            <div className="rounded-2xl p-5 mb-4 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}dd, ${secondary})` }}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
                Total de pessoas na base
              </p>
              <div className="flex items-end justify-between">
                <p className="text-7xl font-black leading-none">{data.total_contatos}</p>
                {data.crescimento_semana > 0 && (
                  <div className="mb-2 text-right">
                    <span className="bg-green-400/30 border border-green-400/40 text-white text-xs font-bold px-3 py-1.5 rounded-full block">
                      +{data.crescimento_semana} essa semana
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-300" />
                  <span className="text-white/80">{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-300" />
                  <span className="text-white/80">{data.total_fechados} votos fechados</span>
                </div>
              </div>
            </div>

            {/* ── GRID DE MÉTRICAS ────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center"
                onClick={() => navigate("/usuarios")} style={{ cursor: "pointer" }}>
                <p className="text-3xl font-black" style={{ color: primary }}>{data.total_coordenadores}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">Coord.</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center"
                onClick={() => navigate("/usuarios")} style={{ cursor: "pointer" }}>
                <p className="text-3xl font-black text-purple-600">{data.total_lideres}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">Líderes</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center"
                onClick={() => navigate("/agenda")} style={{ cursor: "pointer" }}>
                <p className="text-3xl font-black text-teal-600">{data.proximos_eventos.length}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">Eventos</p>
              </div>
            </div>

            {/* ── FORÇA POR REGIÃO (SEMÁFORO) ─────────────────────── */}
            {regioesOrdenadas.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-800">🗺️ Força por Região</h2>
                  <button onClick={() => navigate("/mapa")}
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{ color: primary, borderColor: primary + "44" }}>
                    Ver mapa
                  </button>
                </div>

                {/* Legenda */}
                <div className="flex gap-3 mb-3">
                  {(["forte", "media", "fraca"] as const).map(f => (
                    <div key={f} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${forcaConfig[f].dot}`} />
                      <span className="text-xs text-gray-500">{forcaConfig[f].label}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {regioesOrdenadas.map((r) => {
                    const forca = getForca(r);
                    const cfg = forcaConfig[forca];
                    const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                    const isPrioritaria = r.prioridade === "prioritaria";
                    const isAtencao = r.prioridade === "atencao";

                    return (
                      <div key={r.regiao_id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform ${cfg.bg} ${cfg.border}`}
                        onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">{r.regiao_nome || "Sem nome"}</p>
                            {isPrioritaria && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">🎯 Prioridade</span>
                            )}
                            {isAtencao && !isPrioritaria && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">⚠️ Atenção</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
                            </div>
                            <span className={`text-xs font-bold flex-shrink-0 ${cfg.text}`}>{pct}%</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-gray-700">{r.total}</p>
                          <p className="text-xs text-gray-400">pessoas</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REGIÕES PRIORITÁRIAS ─────────────────────────────── */}
            {regioesPrioritarias.length > 0 && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                <h2 className="text-sm font-bold text-red-800 mb-3">🎯 Regiões Prioritárias</h2>
                <div className="space-y-2">
                  {regioesPrioritarias.map((r) => (
                    <div key={r.regiao_id}
                      className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 cursor-pointer border border-red-100"
                      onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.regiao_nome}</p>
                        <p className="text-xs text-gray-500">{r.total} pessoas • {r.lideres} líderes</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600">
                          {r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0}% fechados
                        </p>
                        <p className="text-xs text-gray-400">→ ver região</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PRÓXIMOS EVENTOS ─────────────────────────────────── */}
            {data.proximos_eventos.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-800">📅 Próximos Eventos</h2>
                  <button onClick={() => navigate("/agenda")}
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{ color: primary, borderColor: primary + "44" }}>
                    Ver agenda
                  </button>
                </div>
                <div className="space-y-2">
                  {data.proximos_eventos.slice(0, 4).map((e) => {
                    const dt = new Date(e.data + "T12:00:00");
                    const hoje = new Date();
                    const diffDias = Math.ceil((dt.getTime() - hoje.setHours(0,0,0,0)) / (1000*60*60*24));
                    return (
                      <div key={e.id} className="flex gap-3 items-center bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                        <div className="rounded-xl p-2.5 text-center flex-shrink-0 w-14"
                          style={{ backgroundColor: primary + "15" }}>
                          <p className="text-xs font-bold" style={{ color: primary }}>
                            {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </p>
                          {diffDias <= 3 && (
                            <p className="text-xs font-bold text-orange-500 mt-0.5">
                              {diffDias === 0 ? "hoje" : diffDias === 1 ? "amanhã" : `em ${diffDias}d`}
                            </p>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{e.titulo}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {e.hora?.slice(0, 5) && `${e.hora.slice(0, 5)} `}
                            {e.local && `• ${e.local}`}
                          </p>
                          {e.criado_por_nome && (
                            <p className="text-xs text-gray-400 mt-0.5">👤 {e.criado_por_nome}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── EQUIPE EM DESTAQUE ───────────────────────────────── */}
            {data.ranking_lideres.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-800">⭐ Líderes em Destaque</h2>
                  <button onClick={() => navigate("/usuarios")}
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{ color: primary, borderColor: primary + "44" }}>
                    Ver equipe
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {data.ranking_lideres.slice(0, 3).map((l, i) => (
                    <div key={l.lider_id ?? i}
                      className={`flex items-center gap-3 px-4 py-3 ${i < 2 ? "border-b border-gray-50" : ""}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                        ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-200 text-gray-600" : "bg-orange-200 text-orange-800"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{l.lider_nome || "Sem nome"}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>🟡 {l.simpatizantes}</span>
                          <span>🟢 {l.fechados} fechados</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black" style={{ color: primary }}>{l.total}</p>
                        <p className="text-xs text-gray-400">pessoas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {data.total_contatos === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-6xl mb-4">📋</p>
                <p className="text-base font-semibold text-gray-600">Campanha ainda vazia</p>
                <p className="text-sm mt-1">Peça ao coordenador geral para começar a cadastrar os dados.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
