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
  alertas: string[];
}

const prioridadeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  normal:     { label: "Normal",     color: "text-gray-600",  bg: "bg-gray-50",   border: "border-gray-200" },
  atencao:    { label: "Atenção",    color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  prioritaria:{ label: "Prioritária",color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200" },
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

  const conversao = data && data.total_contatos > 0
    ? Math.round((data.total_fechados / data.total_contatos) * 100)
    : 0;

  const regioesPrioritarias = data?.por_regiao.filter(r => r.prioridade === "prioritaria" || r.prioridade === "atencao") || [];
  const regioesNormais = data?.por_regiao.filter(r => !r.prioridade || r.prioridade === "normal") || [];

  return (
    <Layout>
      <div className="p-4 max-w-xl mx-auto">

        {/* Candidate Banner */}
        <div className="rounded-2xl p-5 mb-4 text-white shadow-lg relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-4">
            {config.foto_principal ? (
              <img src={config.foto_principal} alt={config.nome_candidato}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🏛️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black truncate">{config.nome_candidato}</p>
              {config.numero && (
                <span className="inline-block bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                  Nº {config.numero}
                </span>
              )}
              {config.slogan && (
                <p className="text-xs text-white/70 italic mt-1 truncate">"{config.slogan}"</p>
              )}
            </div>
            {config.musica_url && (
              <button onClick={toggleMusic}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                <span className="text-base">{musicPlaying ? "⏸️" : "🎵"}</span>
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: primary, borderTopColor: "transparent" }} />
          </div>
        )}

        {data && (
          <>
            {/* Alertas */}
            {data.alertas.length > 0 && (
              <div className="mb-4 space-y-2">
                {data.alertas.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
                    <span className="text-base">⚠️</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hero: Base Total */}
            <div className="rounded-2xl p-5 mb-4 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}cc, ${secondary})` }}>
              <p className="text-sm text-white/70 mb-1">Base Total da Campanha</p>
              <div className="flex items-end gap-4">
                <p className="text-6xl font-black leading-none">{data.total_contatos}</p>
                <div className="mb-1">
                  {data.crescimento_semana > 0 && (
                    <span className="bg-green-400/30 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      +{data.crescimento_semana} esta semana
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-5 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                  <span>{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                  <span>{data.total_fechados} fechados</span>
                </div>
              </div>
              {data.total_contatos > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Conversão para voto fechado</span>
                    <span className="font-bold text-white">{conversao}%</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${conversao}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold" style={{ color: primary }}>{data.total_coordenadores}</p>
                <p className="text-xs text-gray-500 mt-0.5">Coordenadores</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-purple-600">{data.total_lideres}</p>
                <p className="text-xs text-gray-500 mt-0.5">Líderes</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-teal-600">{data.total_regioes}</p>
                <p className="text-xs text-gray-500 mt-0.5">Regiões</p>
              </div>
            </div>

            {/* Regiões que precisam de atenção */}
            {regioesPrioritarias.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🎯 Regiões que precisam de atenção</h2>
                <div className="space-y-2">
                  {regioesPrioritarias.map((r) => {
                    const cfg = prioridadeConfig[r.prioridade || "normal"];
                    const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                    return (
                      <div key={r.regiao_id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${cfg.bg} ${cfg.border}`}
                        onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{r.regiao_nome || "—"}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{r.total} contatos • {pct}% fechados</p>
                        </div>
                        <span className="text-gray-400 text-sm">→</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panorama por Região */}
            {regioesNormais.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">📍 Panorama por Região</h2>
                  <button onClick={() => navigate("/mapa")} className="text-xs font-medium" style={{ color: primary }}>
                    Ver mapa →
                  </button>
                </div>
                <div className="space-y-3">
                  {regioesNormais.map((r) => {
                    const pct = r.total > 0 ? (r.fechados / r.total) * 100 : 0;
                    return (
                      <div key={r.regiao_id}
                        className="cursor-pointer"
                        onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{r.regiao_nome || "Sem região"}</span>
                          <span className="text-gray-500">{r.total} pessoas • {Math.round(pct)}% fechados</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Próximos Eventos */}
            {data.proximos_eventos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">📅 Próximos Eventos</h2>
                  <button onClick={() => navigate("/agenda")} className="text-xs font-medium" style={{ color: primary }}>
                    Ver agenda →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.proximos_eventos.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex gap-3 items-center p-3 rounded-xl"
                      style={{ backgroundColor: primary + "10" }}>
                      <div className="rounded-lg p-2 text-center min-w-[44px]"
                        style={{ backgroundColor: primary + "20" }}>
                        <p className="text-xs font-bold" style={{ color: primary }}>
                          {new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.titulo}</p>
                        <p className="text-xs text-gray-500">{e.hora?.slice(0, 5)} {e.local && `• ${e.local}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações Rápidas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => navigate("/mapa")}
                className="text-white rounded-2xl p-4 text-center font-semibold text-sm shadow active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                🗺️ Ver Mapa
              </button>
              <button onClick={() => navigate("/usuarios")}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 text-center font-semibold text-sm shadow-sm active:scale-95 transition-transform">
                🧑‍🤝‍🧑 Equipe
              </button>
            </div>

            {data.total_contatos === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-5xl mb-3">📊</p>
                <p className="text-sm font-medium">Nenhum dado ainda</p>
                <p className="text-xs mt-1">Peça ao seu coordenador geral para cadastrar os primeiros contatos</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
