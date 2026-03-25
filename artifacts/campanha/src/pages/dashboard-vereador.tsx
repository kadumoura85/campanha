import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────
type BlockId = "alertas" | "hero" | "evolucao" | "regiaoBar" | "semaforo" | "distribuicao" | "rankings" | "eventos";

interface StatsRegiao {
  regiao_id: number | null; regiao_nome: string | null; cor: string | null;
  prioridade: string | null; total: number; simpatizantes: number; fechados: number; lideres: number;
}
interface Evento {
  id: number; titulo: string; data: string; hora: string | null;
  local: string | null; tipo_evento: string; criado_por_nome: string | null;
}
interface StatsLider {
  lider_id: number | null; lider_nome: string | null; total: number; simpatizantes: number; fechados: number;
}
interface EvolucaoSemana { semana: string; total: number; simpatizantes: number; fechados: number; }
interface DashboardData {
  total_contatos: number; total_simpatizantes: number; total_fechados: number;
  total_coordenadores: number; total_lideres: number; total_regioes: number;
  crescimento_semana: number; evolucao_semanal: EvolucaoSemana[];
  por_regiao: StatsRegiao[]; ranking_lideres: StatsLider[];
  proximos_eventos: Evento[]; alertas: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_ORDER: BlockId[] = ["alertas", "hero", "evolucao", "regiaoBar", "semaforo", "distribuicao", "rankings", "eventos"];
const STORAGE_KEY = "vereador_dashboard_order_v2";

const BLOCK_LABELS: Record<BlockId, string> = {
  alertas:    "🔔 Requer Atenção",
  hero:       "📊 Total de Pessoas",
  evolucao:   "📈 Evolução da Campanha",
  regiaoBar:  "📊 Comparação por Região",
  semaforo:   "🗺️ Força por Região",
  distribuicao:"🥧 Distribuição & Meta",
  rankings:   "🏅 Rankings",
  eventos:    "📅 Próximos Eventos",
};

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444","#f97316","#0ea5e9"];

// ── Persistence ────────────────────────────────────────────────────────────
function loadOrder(): BlockId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as BlockId[];
    const valid = parsed.filter(id => DEFAULT_ORDER.includes(id));
    const missing = DEFAULT_ORDER.filter(id => !valid.includes(id));
    return [...valid, ...missing];
  } catch { return DEFAULT_ORDER; }
}
function saveOrder(order: BlockId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getForca(r: StatsRegiao): "forte" | "media" | "fraca" {
  if (r.total === 0) return "fraca";
  const p = (r.fechados / r.total) * 100;
  return p >= 20 ? "forte" : p >= 10 ? "media" : "fraca";
}
const forcaCfg = {
  forte: { dot: "bg-green-500", text: "text-green-700", bar: "#22c55e" },
  media: { dot: "bg-yellow-400", text: "text-yellow-700", bar: "#eab308" },
  fraca: { dot: "bg-red-500",   text: "text-red-700",   bar: "#ef4444" },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>;
}
function CardTitle({ icon, title, onAction, action }: { icon: string; title: string; onAction?: () => void; action?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-1">
      <div className="flex items-center gap-2">
        <span>{icon}</span><h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {action && onAction && <button onClick={onAction} className="text-xs text-gray-400 hover:text-gray-600 font-medium">{action}</button>}
    </div>
  );
}
function RingProgress({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 38, c = 2 * Math.PI * r;
  return (
    <svg width={90} height={90} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${(value / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x={50} y={46} textAnchor="middle" fontSize={18} fontWeight={900} fill="#111827">{value}%</text>
      <text x={50} y={62} textAnchor="middle" fontSize={9} fill="#6b7280">{label}</text>
    </svg>
  );
}

// ── Drag Handle ─────────────────────────────────────────────────────────────
function DragHandle({ controls, primary }: { controls: ReturnType<typeof useDragControls>; primary: string }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 py-2 mb-2 rounded-xl cursor-grab active:cursor-grabbing touch-none select-none"
      style={{ backgroundColor: primary + "18" }}
      onPointerDown={(e) => controls.start(e)}>
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        {[0,4,8].map(y => (
          <g key={y}>
            <circle cx="5" cy={y+2} r="1.5" fill={primary + "99"} />
            <circle cx="9" cy={y+2} r="1.5" fill={primary + "99"} />
            <circle cx="13" cy={y+2} r="1.5" fill={primary + "99"} />
          </g>
        ))}
      </svg>
      <span className="text-xs font-medium" style={{ color: primary + "bb" }}>Segurar para mover</span>
    </div>
  );
}

// ── Sortable Item Wrapper ────────────────────────────────────────────────────
function SortableBlock({ id, isEditing, primary, children }: {
  id: BlockId; isEditing: boolean; primary: string; children: React.ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={isEditing ? controls : undefined}
      whileDrag={{ scale: 1.025, boxShadow: "0 12px 40px rgba(0,0,0,.15)", zIndex: 50, opacity: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      layout
      layoutId={id}
      className="relative">
      <AnimatePresence>
        {isEditing && (
          <motion.div
            key="handle"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}>
            <DragHandle controls={controls} primary={primary} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </Reorder.Item>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockOrder, setBlockOrder] = useState<BlockId[]>(loadOrder);
  const [isEditing, setIsEditing] = useState(false);
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiGet<DashboardData>("/api/dashboard/vereador").then(setData).finally(() => setLoading(false));
  }, []);

  const handleReorder = useCallback((newOrder: BlockId[]) => {
    setBlockOrder(newOrder);
    saveOrder(newOrder);
  }, []);

  const resetOrder = () => {
    setBlockOrder(DEFAULT_ORDER);
    saveOrder(DEFAULT_ORDER);
  };

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

  // ── Derived data ─────────────────────────────────────────────────────────
  const evolucaoChart = (data?.evolucao_semanal || []).map((s, i) => ({
    sem: `S${i + 1}`, Cadastros: s.total, Fechados: s.fechados,
  }));
  const regiaoBarData = [...(data?.por_regiao || [])].sort((a, b) => b.total - a.total)
    .map(r => ({ name: r.regiao_nome || "—", total: r.total, fechados: r.fechados }));
  const donutData = (data?.por_regiao || []).filter(r => r.total > 0)
    .map((r, i) => ({ name: r.regiao_nome || "—", value: r.total, color: r.cor || PALETTE[i % PALETTE.length] }));
  const conversao = data && data.total_contatos > 0 ? Math.round((data.total_fechados / data.total_contatos) * 100) : 0;
  const crescPct = data && data.total_contatos > 0 ? Math.round((data.crescimento_semana / data.total_contatos) * 100) : 0;
  const regioesCom = (data?.por_regiao || []).filter(r => r.total > 0);
  const melhores = [...regioesCom].sort((a, b) => (b.fechados / b.total) - (a.fechados / a.total)).slice(0, 3);
  const piores   = [...regioesCom].sort((a, b) => (a.fechados / a.total) - (b.fechados / b.total)).slice(0, 3);
  const semaforo  = [...(data?.por_regiao || [])].sort((a, b) => ({ fraca: 0, media: 1, forte: 2 }[getForca(a)] - { fraca: 0, media: 1, forte: 2 }[getForca(b)]));
  const alertasVisuais = [...(data?.alertas || [])];
  if (regioesCom.filter(r => getForca(r) === "fraca").length > 0 && !alertasVisuais.some(a => a.includes("baixa atividade")))
    alertasVisuais.push(`${regioesCom.filter(r => getForca(r) === "fraca").length} região(ões) com baixa atividade`);
  const yAxisW = Math.min(Math.max((regiaoBarData[0]?.name.length || 6) * 6.5, 60), 110);

  // ── Block renderers ───────────────────────────────────────────────────────
  const renderBlock = (id: BlockId): React.ReactNode => {
    if (!data) return null;
    switch (id) {

      case "alertas":
        if (!alertasVisuais.length) return null;
        return (
          <div className="rounded-2xl overflow-hidden border border-orange-200 shadow-sm">
            <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
              <span>🔔</span><span className="text-white text-sm font-bold">Requer atenção</span>
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
        );

      case "hero":
        return (
          <div>
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
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-300" /><span className="text-white/80">{data.total_simpatizantes} simpatizantes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-300" /><span className="text-white/80">{data.total_fechados} fechados</span></div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: data.total_coordenadores, label: "Coord.",  color: primary,    href: "/usuarios" },
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
        );

      case "evolucao":
        if (!evolucaoChart.length) return null;
        return (
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
        );

      case "regiaoBar":
        if (!regiaoBarData.length) return null;
        return (
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
        );

      case "semaforo":
        if (!semaforo.length) return null;
        return (
          <Card>
            <CardTitle icon="🗺️" title="Força por Região" action="Ver mapa" onAction={() => navigate("/mapa")} />
            <div className="flex gap-3 px-4 pb-2">
              {(["forte","media","fraca"] as const).map(f => (
                <div key={f} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${forcaCfg[f].dot}`} />
                  <span className="text-[10px] text-gray-500">{{ forte:"Forte", media:"Média", fraca:"Fraca" }[f]}</span>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3 space-y-2">
              {semaforo.map(r => {
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
                        {r.prioridade === "prioritaria" && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-medium">🎯</span>}
                        {r.prioridade === "atencao"     && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-md font-medium">⚠️</span>}
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
        );

      case "distribuicao":
        return (
          <div className="grid grid-cols-2 gap-4">
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
            <Card>
              <div className="p-3">
                <p className="text-xs font-bold text-gray-700 mb-0.5">🎯 Progresso</p>
                <p className="text-[10px] text-gray-400 mb-2">votos e crescimento</p>
                <div className="flex justify-center">
                  <RingProgress value={conversao} label="fechados" color="#10b981" />
                </div>
                <p className="text-[10px] text-center text-gray-500 mb-2">Votos fechados</p>
                <div className="border-t border-gray-50 pt-2">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Crescimento semana</span>
                    <span className="font-bold text-green-600">+{crescPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(crescPct * 2, 100)}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case "rankings":
        return (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">🏅 Rankings</h2>
            {(melhores.length > 0 || piores.length > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {melhores.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="text-xs font-bold text-green-700 mb-2">✅ Melhores</p>
                      <div className="space-y-2">
                        {melhores.map((r, i) => {
                          const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                          return (
                            <div key={r.regiao_id} className="cursor-pointer" onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
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
                {piores.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="text-xs font-bold text-red-700 mb-2">⚠️ Atenção</p>
                      <div className="space-y-2">
                        {piores.map((r, i) => {
                          const pct = r.total > 0 ? Math.round((r.fechados / r.total) * 100) : 0;
                          return (
                            <div key={r.regiao_id} className="cursor-pointer" onClick={() => r.regiao_id && navigate(`/regioes/${r.regiao_id}`)}>
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
            {data.ranking_lideres.length > 0 && (
              <Card>
                <CardTitle icon="⭐" title="Líderes Mais Ativos" action="Ver equipe" onAction={() => navigate("/usuarios")} />
                <div className="px-3 pb-3 space-y-0">
                  {data.ranking_lideres.slice(0, 5).map((l, i) => {
                    const max = data.ranking_lideres[0]?.total || 1;
                    return (
                      <div key={l.lider_id ?? i} className={`flex items-center gap-3 py-2.5 ${i < 4 ? "border-b border-gray-50" : ""}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                          ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-600" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-gray-100 text-gray-500"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{l.lider_nome || "Sem nome"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.round((l.total / max) * 100)}%`, backgroundColor: primary }} />
                            </div>
                            <div className="flex gap-1.5 text-[10px] text-gray-400 flex-shrink-0">
                              <span>🟡{l.simpatizantes}</span><span>🟢{l.fechados}</span>
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
        );

      case "eventos":
        if (!data.proximos_eventos.length) return null;
        return (
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
                const diffDias = Math.ceil((dt.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
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
                      <p className="text-xs text-gray-500 truncate">{e.hora?.slice(0,5)}{e.hora && e.local ? " • " : ""}{e.local}</p>
                      {e.criado_por_nome && <p className="text-[10px] text-gray-400 mt-0.5">👤 {e.criado_por_nome}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 max-w-xl mx-auto">

        {/* ── CANDIDATE BANNER (fixed, always top) ─── */}
        <div className="rounded-2xl p-4 mb-4 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-3">
            {config.foto_principal
              ? <img src={config.foto_principal} alt="" className="w-[52px] h-[52px] rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              : <div className="w-[52px] h-[52px] bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl">🏛️</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black truncate leading-tight">{config.nome_candidato}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {config.numero && <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">Nº {config.numero}</span>}
                {config.slogan && <p className="text-xs text-white/70 italic truncate">"{config.slogan}"</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {config.musica_url && (
                <button onClick={toggleMusic} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  {musicPlaying ? "⏸️" : "🎵"}
                </button>
              )}
              {/* Personalize toggle */}
              <button onClick={() => setIsEditing(e => !e)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isEditing ? "bg-white text-gray-800" : "bg-white/20 text-white"}`}
                title="Personalizar dashboard">
                {isEditing ? "✓" : "✦"}
              </button>
            </div>
          </div>
        </div>

        {/* ── EDIT MODE BAR ─── */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 overflow-hidden">
              <div className="rounded-2xl border-2 p-3 flex items-center gap-3" style={{ borderColor: primary + "44", backgroundColor: primary + "08" }}>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: primary }}>Modo personalização ativo</p>
                  <p className="text-xs text-gray-500">Segure o handle de cada bloco e arraste para reorganizar</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={resetOrder}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 font-medium bg-white">
                    Padrão
                  </button>
                  <button onClick={() => setIsEditing(false)}
                    className="text-xs px-3 py-1.5 rounded-full text-white font-semibold"
                    style={{ backgroundColor: primary }}>
                    Pronto
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: primary, borderTopColor: "transparent" }} />
            <p className="text-sm text-gray-400 mt-3">Carregando...</p>
          </div>
        )}

        {/* ── SORTABLE BLOCKS ─── */}
        {data && (
          <Reorder.Group
            axis="y"
            values={blockOrder}
            onReorder={handleReorder}
            className="space-y-4"
            as="div">
            {blockOrder.map(blockId => {
              const content = renderBlock(blockId);
              if (!content) return null;
              return (
                <SortableBlock key={blockId} id={blockId} isEditing={isEditing} primary={primary}>
                  {content}
                </SortableBlock>
              );
            })}
          </Reorder.Group>
        )}

        {data?.total_contatos === 0 && (
          <div className="text-center py-12 text-gray-400 mt-4">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-base font-semibold text-gray-600">Campanha ainda vazia</p>
            <p className="text-sm mt-1">Peça ao coordenador geral para cadastrar os primeiros dados.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
