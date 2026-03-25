import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Interfaces ─────────────────────────────────────────────────────────────
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
interface EvolucaoSemana {
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
  evolucao_semanal: EvolucaoSemana[];
  por_regiao: StatsRegiao[];
  ranking_lideres: StatsLider[];
  proximos_eventos: Evento[];
  alertas: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444","#f97316","#0ea5e9"];

function getForca(r: StatsRegiao): "forte" | "media" | "fraca" {
  if (r.total === 0) return "fraca";
  const pct = (r.fechados / r.total) * 100;
  if (pct >= 20) return "forte";
  if (pct >= 10) return "media";
  return "fraca";
}
const forcaCfg = {
  forte: { dot: "bg-green-500", text: "text-green-700", bar: "#22c55e", badge: "bg-green-100 text-green-700", label: "Forte" },
  media: { dot: "bg-yellow-400", text: "text-yellow-700", bar: "#eab308", badge: "bg-yellow-100 text-yellow-700", label: "Média" },
  fraca: { dot: "bg-red-500",   text: "text-red-700",   bar: "#ef4444", badge: "bg-red-100 text-red-700",   label: "Fraca" },
};

// Circular progress SVG
function RingProgress({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x={50} y={46} textAnchor="middle" fontSize={18} fontWeight={900} fill="#111827">{value}%</text>
        <text x={50} y={62} textAnchor="middle" fontSize={9} fill="#6b7280">{label}</text>
      </svg>
    </div>
  );
}

// Section card wrapper
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>;
}
function CardTitle({ icon, title, action, onAction }: { icon: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction} className="text-xs text-gray-400 hover:text-gray-600 font-medium">{action}</button>
      )}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardVereador | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiGet<DashboardVereador>("/api/dashboard/vereador").then(setData).finally(() => setLoading(false));
  }, []);

  const toggleMusic = () => {
    if (!config.musica_url) return;
    if (!audioEl) {
      const a = new Audio(config.musica_url); a.loop = true; a.play();
      setAudioEl(a); setMusicPlaying(true);
    } else {
      if (musicPlaying) { audioEl.pause(); setMusicPlaying(false); }
      else { audioEl.play(); setMusicPlaying(true); }
    }
  };

  const primary   = config.cor_primaria   || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";

  // ── Derived data ───────────────────────────────────────────────────────
  const evolucaoChart = (data?.evolucao_semanal || []).map((s, i) => ({
    sem: `S${i + 1}`, Cadastros: s.total, Fechados: s.fechados,
  }));

  const regiaoBarData = [...(data?.por_regiao || [])]
    .sort((a, b) => b.total - a.total)
    .map(r => ({ name: r.regiao_nome || "—", total: r.total, fechados: r.fechados }));

  const donutData = (data?.por_regiao || [])
    .filter(r => r.total > 0)
    .map((r, i) => ({ name: r.regiao_nome || "—", value: r.total, color: r.cor || PALETTE[i % PALETTE.length] }));

  const conversao = data && data.total_contatos > 0
    ? Math.round((data.total_fechados / data.total_contatos) * 100) : 0;
  const crescimentoPct = data && data.total_contatos > 0
    ? Math.round((data.crescimento_semana / data.total_contatos) * 100) : 0;

  const regioesComDados = (data?.por_regiao || []).filter(r => r.total > 0);
  const melhoresRegioes = [...regioesComDados]
    .sort((a, b) => (b.fechados / b.total) - (a.fechados / a.total)).slice(0, 3);
  const pioresRegioes = [...regioesComDados]
    .sort((a, b) => (a.fechados / a.total) - (b.fechados / b.total)).slice(0, 3);

  const regioesSemaforo = [...(data?.por_regiao || [])].sort((a, b) => {
    const ord = { fraca: 0, media: 1, forte: 2 };
    return ord[getForca(a)] - ord[getForca(b)];
  });

  const alertasVisuais = [...(data?.alertas || [])];
  const regioesFracas = regioesComDados.filter(r => getForca(r) === "fraca");
  if (regioesFracas.length > 0 && !alertasVisuais.some(a => a.includes("baixa atividade")))
    alertasVisuais.push(`${regioesFracas.length} região(ões) com baixa atividade`);

  // YAxis width for region names
  const maxNomeLen = Math.max(...regiaoBarData.map(r => r.name.length), 6);
  const yAxisW = Math.min(Math.max(maxNomeLen * 6, 60), 110);

  return (
    <Layout>
      <div className="p-4 max-w-xl mx-auto space-y-4">

        {/* ── BANNER CANDIDATO ──────────────────────────────────────── */}
        <div className="rounded-2xl p-4 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-3">
            {config.foto_principal
              ? <img src={config.foto_principal} alt="" className="w-13 h-13 w-[52px] h-[52px] rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              : <div className="w-[52px] h-[52px] bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl">🏛️</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black truncate leading-tight">{config.nome_candidato}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {config.numero && <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">Nº {config.numero}</span>}
                {config.slogan && <p className="text-xs text-white/70 italic truncate">"{config.slogan}"</p>}
              </div>
            </div>
            {config.musica_url && (
              <button onClick={toggleMusic} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {musicPlaying ? "⏸️" : "🎵"}
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

        {data && <>

          {/* ── ALERTAS ───────────────────────────────────────────────── */}
          {alertasVisuais.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-orange-200 shadow-sm">
              <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
                <span>🔔</span>
                <span className="text-white text-sm font-bold">Requer atenção</span>
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

          {/* ── 1. CARDS PRINCIPAIS ─────────────────────────────────── */}
          <div>
            {/* Hero */}
            <div className="rounded-2xl p-5 mb-3 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}dd, ${secondary})` }}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Total de pessoas na base</p>
              <div className="flex items-end justify-between">
                <p className="text-7xl font-black leading-none">{data.total_contatos}</p>
                {data.crescimento_semana > 0 && (
                  <span className="bg-green-400/30 border border-green-400/30 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-2">
                    +{data.crescimento_semana} essa semana ↑
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-300" />
                  <span className="text-white/80">{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-300" />
                  <span className="text-white/80">{data.total_fechados} fechados</span>
                </div>
              </div>
            </div>

            {/* Stats 4-grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: data.total_coordenadores, label: "Coord.", color: primary,     href: "/usuarios" },
                { val: data.total_lideres,        label: "Líderes", color: "#7c3aed",  href: "/usuarios" },
                { val: data.total_regioes,        label: "Regiões", color: "#0d9488",  href: "/mapa"     },
                { val: data.proximos_eventos.length, label: "Eventos", color: "#d97706", href: "/agenda" },
              ].map(({ val, label, color, href }) => (
                <div key={label} onClick={() => navigate(href)}
                  className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform">
                  <p className="text-2xl font-black" style={{ color }}>{val}</p>
                  <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. GRÁFICO DE EVOLUÇÃO ──────────────────────────────── */}
          {evolucaoChart.length > 0 && (
            <Card>
              <CardTitle icon="📈" title="Evolução da Campanha" />
              <p className="px-4 pb-1 text-xs text-gray-400">Crescimento por semana — cadastros e votos fechados</p>
              <div className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={evolucaoChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFech" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="sem" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="Cadastros" stroke={primary} strokeWidth={2.5} fill="url(#gCad)" dot={{ r: 3, fill: primary }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="Fechados" stroke="#10b981" strokeWidth={2.5} fill="url(#gFech)" dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-5 mt-1">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: primary }} /><span className="text-xs text-gray-500">Cadastros</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-gray-500">Fechados</span></div>
                </div>
              </div>
            </Card>
          )}

          {/* ── 3. COMPARAÇÃO POR REGIÃO ────────────────────────────── */}
          {regiaoBarData.length > 0 && (
            <Card>
              <CardTitle icon="📊" title="Comparação por Região" action="Ver mapa" onAction={() => navigate("/mapa")} />
              <p className="px-4 pb-1 text-xs text-gray-400">Pessoas cadastradas — maior para menor</p>
              <div className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={Math.max(regiaoBarData.length * 38, 120)}>
                  <BarChart layout="vertical" data={regiaoBarData} margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={yAxisW} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 12 }} />
                    <Bar dataKey="total" name="Total" fill={primary} radius={[0, 6, 6, 0]} maxBarSize={18} />
                    <Bar dataKey="fechados" name="Fechados" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── 4. FORÇA POR REGIÃO (SEMÁFORO) ─────────────────────── */}
          {regioesSemaforo.length > 0 && (
            <Card>
              <CardTitle icon="🗺️" title="Força por Região" action="Ver mapa" onAction={() => navigate("/mapa")} />
              <div className="flex gap-3 px-4 pb-2">
                {(["forte","media","fraca"] as const).map(f => (
                  <div key={f} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${forcaCfg[f].dot}`} />
                    <span className="text-[10px] text-gray-500">{forcaCfg[f].label}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3 space-y-2">
                {regioesSemaforo.map(r => {
                  const fc = getForca(r);
                  const cfg = forcaCfg[fc];
                  const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                  return (
                    <div key={r.regiao_id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-transform border border-gray-100 hover:border-gray-200"
                      onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{r.regiao_nome || "—"}</p>
                          {(r.prioridade === "prioritaria") && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-medium">🎯</span>}
                          {(r.prioridade === "atencao")    && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-md font-medium">⚠️</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
                          </div>
                          <span className={`text-[10px] font-bold ${cfg.text}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black text-gray-700">{r.total}</p>
                        <p className="text-[10px] text-gray-400">pessoas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── 5–6. DISTRIBUIÇÃO + META PROGRESSO ─────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Donut */}
            {donutData.length > 0 && (
              <Card>
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-700 mb-0.5">🥧 Distribuição</p>
                  <p className="text-[10px] text-gray-400 mb-2">por região</p>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2}>
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}
                        formatter={(v: number) => [`${v} pessoas`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-1">
                    {donutData.slice(0, 4).map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <p className="text-[10px] text-gray-600 truncate">{d.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 ml-auto">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Progress rings */}
            <Card>
              <div className="p-3">
                <p className="text-xs font-bold text-gray-700 mb-0.5">🎯 Progresso</p>
                <p className="text-[10px] text-gray-400 mb-2">votos e crescimento</p>
                <div className="space-y-2">
                  <div>
                    <RingProgress value={conversao} label="fechados" color="#10b981" />
                    <p className="text-[10px] text-center text-gray-500 mt-1">Votos fechados</p>
                  </div>
                  <div className="border-t border-gray-50 pt-2">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>Crescimento semanal</span>
                      <span className="font-bold text-green-600">+{crescimentoPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(crescimentoPct * 2, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── 7. RANKINGS ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">🏅 Rankings</h2>

            {/* Melhores e piores regiões */}
            {(melhoresRegioes.length > 0 || pioresRegioes.length > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-3">

                {/* Melhores */}
                {melhoresRegioes.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="text-xs font-bold text-green-700 mb-2">✅ Melhores</p>
                      <div className="space-y-2">
                        {melhoresRegioes.map((r, i) => {
                          const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                          return (
                            <div key={r.regiao_id} className="cursor-pointer"
                              onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-black text-gray-400">{i + 1}º</span>
                                <p className="text-[11px] font-semibold text-gray-700 truncate">{r.regiao_nome}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[9px] font-bold text-green-600">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Piores */}
                {pioresRegioes.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="text-xs font-bold text-red-700 mb-2">⚠️ Atenção</p>
                      <div className="space-y-2">
                        {pioresRegioes.map((r, i) => {
                          const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                          return (
                            <div key={r.regiao_id} className="cursor-pointer"
                              onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-black text-gray-400">{i + 1}º</span>
                                <p className="text-[11px] font-semibold text-gray-700 truncate">{r.regiao_nome}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[9px] font-bold text-red-600">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Líderes mais ativos */}
            {data.ranking_lideres.length > 0 && (
              <Card>
                <CardTitle icon="⭐" title="Líderes Mais Ativos" action="Ver equipe" onAction={() => navigate("/usuarios")} />
                <div className="px-3 pb-3 space-y-0">
                  {data.ranking_lideres.slice(0, 5).map((l, i) => {
                    const maxTotal = data.ranking_lideres[0]?.total || 1;
                    const pct = Math.round((l.total / maxTotal) * 100);
                    return (
                      <div key={l.lider_id ?? i} className={`flex items-center gap-3 py-2.5 ${i < data.ranking_lideres.slice(0,5).length - 1 ? "border-b border-gray-50" : ""}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                          ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-600" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-gray-100 text-gray-500"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{l.lider_nome || "Sem nome"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: primary }} />
                            </div>
                            <div className="flex gap-2 text-[10px] text-gray-400 flex-shrink-0">
                              <span>🟡{l.simpatizantes}</span>
                              <span>🟢{l.fechados}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-lg font-black" style={{ color: primary }}>{l.total}</p>
                          <p className="text-[10px] text-gray-400">pessoas</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* ── PRÓXIMOS EVENTOS ─────────────────────────────────────── */}
          {data.proximos_eventos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-800">📅 Próximos Eventos</h2>
                <button onClick={() => navigate("/agenda")}
                  className="text-xs font-semibold px-3 py-1 rounded-full border"
                  style={{ color: primary, borderColor: primary + "44" }}>
                  Ver agenda
                </button>
              </div>
              <div className="space-y-2">
                {data.proximos_eventos.slice(0, 4).map(e => {
                  const dt = new Date(e.data + "T12:00:00");
                  const hoje = new Date();
                  const diffDias = Math.ceil((dt.getTime() - new Date(hoje.setHours(0,0,0,0)).getTime()) / 86400000);
                  return (
                    <div key={e.id} className="flex gap-3 items-center bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                      <div className="rounded-xl p-2 text-center flex-shrink-0 w-14" style={{ backgroundColor: primary + "15" }}>
                        <p className="text-[11px] font-bold" style={{ color: primary }}>
                          {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                        {diffDias <= 3 && diffDias >= 0 && (
                          <p className="text-[10px] font-bold text-orange-500">
                            {diffDias === 0 ? "hoje" : diffDias === 1 ? "amanhã" : `${diffDias}d`}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{e.titulo}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {e.hora?.slice(0, 5)}{e.hora && e.local ? " • " : ""}{e.local}
                        </p>
                        {e.criado_por_nome && <p className="text-[10px] text-gray-400 mt-0.5">👤 {e.criado_por_nome}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.total_contatos === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-6xl mb-4">📋</p>
              <p className="text-base font-semibold text-gray-600">Campanha ainda vazia</p>
              <p className="text-sm mt-1">Peça ao coordenador geral para cadastrar os primeiros dados.</p>
            </div>
          )}

        </>}
      </div>
    </Layout>
  );
}
