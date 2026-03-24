import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

interface StatsCoordenador {
  coordenador_id: number | null;
  coordenador_nome: string | null;
  regiao_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
  lideres: number;
}

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

interface StatsLider {
  lider_id: number | null;
  lider_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
  tipo_evento: string;
}

interface EvolucaoSemanal {
  semana: string;
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
  evolucao_semanal: EvolucaoSemanal[];
  por_coordenador: StatsCoordenador[];
  por_regiao: StatsRegiao[];
  ranking_lideres: StatsLider[];
  proximos_eventos: Evento[];
  alertas: string[];
}

const tipoEventoLabel: Record<string, string> = {
  reuniao: "Reunião", caminhada: "Caminhada", visita: "Visita",
  comicio: "Comício", acao_de_rua: "Ação de Rua", evento_interno: "Interno",
};

const prioridadeConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "Normal", color: "text-gray-600", bg: "bg-gray-100" },
  atencao: { label: "Atenção", color: "text-yellow-700", bg: "bg-yellow-100" },
  prioritaria: { label: "Prioritária", color: "text-red-700", bg: "bg-red-100" },
};

function formatSemana(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardVereador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiGet<DashboardVereador>("/api/dashboard/vereador")
      .then(setData)
      .catch((err) => setError(err.message))
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
      if (musicPlaying) {
        audioEl.pause();
        setMusicPlaying(false);
      } else {
        audioEl.play();
        setMusicPlaying(true);
      }
    }
  };

  const pieData = data ? [
    { name: "Contatos", value: Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados), color: "#6B7280" },
    { name: "Simpatizantes", value: data.total_simpatizantes, color: "#F59E0B" },
    { name: "Fechados", value: data.total_fechados, color: "#10B981" },
  ].filter(d => d.value > 0) : [];

  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";

  const evolucaoChart = data?.evolucao_semanal?.map(e => ({
    semana: formatSemana(e.semana),
    Total: e.total,
    Fechados: e.fechados,
    Simpatizantes: e.simpatizantes,
  })) || [];

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">

        {/* Candidate Identity Banner */}
        <div className="rounded-2xl p-5 mb-4 text-white shadow-lg relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-4">
            {config.foto_principal ? (
              <img src={config.foto_principal} alt={config.nome_candidato}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🏛️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black truncate">{config.nome_candidato}</p>
              {config.numero && (
                <div className="inline-block bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                  Número {config.numero}
                </div>
              )}
              {config.slogan && (
                <p className="text-sm text-white/80 italic mt-1 truncate">"{config.slogan}"</p>
              )}
            </div>
            {config.musica_url && (
              <button onClick={toggleMusic}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                title={musicPlaying ? "Pausar música" : "Tocar música da campanha"}>
                <span className="text-lg">{musicPlaying ? "⏸️" : "🎵"}</span>
              </button>
            )}
          </div>
          {config.frase_institucional && (
            <p className="text-xs text-white/60 mt-3 border-t border-white/20 pt-2">{config.frase_institucional}</p>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-500">Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {data && (
          <>
            {/* Alertas */}
            {data.alertas.length > 0 && (
              <div className="mb-4 space-y-2">
                {data.alertas.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-sm text-yellow-800">
                    <span>⚠️</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hero Card */}
            <div className="rounded-2xl p-5 mb-4 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}cc, ${secondary})` }}>
              <p className="text-sm text-white/70 mb-1">Total Geral da Base</p>
              <p className="text-6xl font-black">{data.total_contatos}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                  <span>{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                  <span>{data.total_fechados} fechados</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/60">
                +{data.crescimento_semana} novos essa semana
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-indigo-600">{data.total_coordenadores}</p>
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

            {/* Evolução Semanal */}
            {evolucaoChart.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📈 Evolução Semanal</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={evolucaoChart}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={primary} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorFechados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Total" stroke={primary} strokeWidth={2} fill="url(#colorTotal)" name="Total" />
                    <Area type="monotone" dataKey="Fechados" stroke="#10B981" strokeWidth={2} fill="url(#colorFechados)" name="Fechados" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição da Base</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Por Região */}
            {data.por_regiao.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Por Região</h2>
                  <button onClick={() => navigate("/regioes")} className="text-xs font-medium" style={{ color: primary }}>Ver todas →</button>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.por_regiao.map(r => ({ name: r.regiao_nome || "Sem região", total: r.total, fechados: r.fechados }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total" fill={primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fechados" name="Fechados" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {data.por_regiao.filter(r => r.prioridade !== "normal").map((r, i) => {
                  const cfg = prioridadeConfig[r.prioridade || "normal"];
                  return (
                    <div key={i} className={`flex items-center justify-between mt-2 px-3 py-2 ${cfg.bg} rounded-lg`}>
                      <span className={`text-xs font-medium ${cfg.color}`}>{r.regiao_nome} — {cfg.label}</span>
                      <span className={`text-xs font-bold ${cfg.color}`}>{r.total} contatos</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranking Líderes */}
            {data.ranking_lideres.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Ranking de Líderes</h2>
                <div className="space-y-2">
                  {data.ranking_lideres.slice(0, 5).map((l, i) => (
                    <div key={l.lider_id ?? i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-gray-100 text-gray-600"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{l.lider_nome || "Sem nome"}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>🟡 {l.simpatizantes}</span>
                          <span>🟢 {l.fechados}</span>
                        </div>
                      </div>
                      <span className="text-lg font-bold" style={{ color: primary }}>{l.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Por Coordenador */}
            {data.por_coordenador.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Ranking por Coordenador</h2>
                <div className="space-y-3">
                  {data.por_coordenador.map((c, i) => (
                    <div key={c.coordenador_id ?? i} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{c.coordenador_nome || "Sem coordenador"}</p>
                          {c.regiao_nome && <p className="text-xs text-gray-400">📍 {c.regiao_nome}</p>}
                        </div>
                        <span className="text-2xl font-bold" style={{ color: primary }}>{c.total}</span>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>👥 {c.lideres} líderes</span>
                        <span>🟡 {c.simpatizantes}</span>
                        <span>🟢 {c.fechados}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${data.total_contatos > 0 ? (c.total / data.total_contatos) * 100 : 0}%`, backgroundColor: primary }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximos Eventos */}
            {data.proximos_eventos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">📅 Próximos Eventos</h2>
                  <button onClick={() => navigate("/agenda")} className="text-xs font-medium" style={{ color: primary }}>Ver agenda →</button>
                </div>
                <div className="space-y-2">
                  {data.proximos_eventos.map((e) => (
                    <div key={e.id} className="flex gap-3 items-start p-3 rounded-xl" style={{ backgroundColor: primary + "12" }}>
                      <div className="rounded-lg p-2 text-center min-w-[44px]" style={{ backgroundColor: primary + "22" }}>
                        <p className="text-xs font-bold" style={{ color: primary }}>{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                        <p className="text-xs text-gray-500">{tipoEventoLabel[e.tipo_evento]} {e.hora && `• ${e.hora.slice(0,5)}`} {e.local && `• ${e.local}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.total_contatos === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-5xl mb-3">📊</p>
                <p className="text-sm">Nenhum dado disponível ainda</p>
                <p className="text-xs mt-1">Cadastre contatos para ver as estatísticas</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
