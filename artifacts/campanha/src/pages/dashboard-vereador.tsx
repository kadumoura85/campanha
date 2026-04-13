import { useEffect, useMemo, useState } from "react";
import { Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";
import { getCampaignDisplayName } from "@/lib/campanha";
import { getPrioridadeConfig } from "@/lib/prioridade";

const BaseDistribuicaoChart = lazy(() => import("@/components/BaseDistribuicaoChart"));
const CoordenadoresComparativoChart = lazy(() => import("@/components/CoordenadoresComparativoChart"));

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

interface EvolucaoSemana {
  semana: string;
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
  criado_por_nome: string | null;
}

interface DashboardData {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_coordenadores: number;
  total_lideres: number;
  total_regioes: number;
  crescimento_semana: number;
  evolucao_semanal: EvolucaoSemana[];
  por_coordenador: StatsCoordenador[];
  por_regiao: StatsRegiao[];
  ranking_lideres: StatsLider[];
  proximos_eventos: Evento[];
  alertas: string[];
}

type AlertaExecutivo = {
  titulo: string;
  detalhe: string;
  tone: "red" | "yellow" | "blue";
  href?: string;
  acao?: string;
};

type BlockId = "decisao" | "visao" | "coordenadores" | "lideres" | "regioes" | "eventos";

const STORAGE_KEY = "vereador_dashboard_order_v5";
const DEFAULT_ORDER: BlockId[] = ["regioes", "visao", "decisao", "coordenadores", "lideres", "eventos"];

function loadOrder(): BlockId[] {
  try {
    if (typeof window === "undefined") return DEFAULT_ORDER;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as BlockId[];
    const valid = parsed.filter((item) => DEFAULT_ORDER.includes(item));
    const missing = DEFAULT_ORDER.filter((item) => !valid.includes(item));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_ORDER;
  }
}

function saveOrder(order: BlockId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function ChartLoadingBox({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-gray-50 text-xs font-medium text-gray-400"
      style={{ height }}
    >
      Carregando grafico...
    </div>
  );
}

function ResumoCard({
  label,
  value,
  hint,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  color: string;
  onClick?: () => void;
}) {
  const Component = onClick ? "button" : "div";
  const effectiveHint = label === "Base total" ? "Soma de contatos, simpatizantes e fechados" : hint;

  return (
    <Card className="overflow-hidden">
      <Component
        onClick={onClick}
        className={`w-full p-4 text-left ${onClick ? "cursor-pointer transition-colors hover:bg-gray-50" : ""}`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-tight text-gray-500 leading-tight min-h-[2rem]">
          {label}
        </p>
        <p className={`text-3xl font-black mt-2 ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-1">{effectiveHint}</p>
      </Component>
    </Card>
  );
}

function ActionButton({
  label,
  hint,
  onClick,
  primary = false,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl p-4 border transition-colors ${
        primary ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-800 hover:border-gray-300"
      }`}
    >
      <p className="text-sm font-bold">{label}</p>
      <p className={`text-xs mt-1 ${primary ? "text-white/80" : "text-gray-500"}`}>{hint}</p>
    </button>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function DragHandle({
  primary,
  controls,
}: {
  primary: string;
  controls: ReturnType<typeof useDragControls>;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-2 mb-2 rounded-xl cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: `${primary}16` }}
      onPointerDown={(event) => controls.start(event)}
    >
      <span className="text-xs font-medium" style={{ color: primary }}>Segure para mover</span>
    </div>
  );
}

function SortableBlock({
  id,
  isEditing,
  primary,
  children,
}: {
  id: BlockId;
  isEditing: boolean;
  primary: string;
  children: React.ReactNode;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={isEditing ? controls : undefined}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px rgba(0,0,0,.12)" }}
    >
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <DragHandle primary={primary} controls={controls} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </Reorder.Item>
  );
}

export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockOrder, setBlockOrder] = useState<BlockId[]>(loadOrder);
  const [isEditing, setIsEditing] = useState(false);
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const campaignName = getCampaignDisplayName(config.nome_candidato);
  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";

  useEffect(() => {
    apiGet<DashboardData>("/api/dashboard/vereador").then(setData).finally(() => setLoading(false));
  }, []);

  const resumoExecutivo = useMemo(() => {
    if (!data) return null;
    const contatosAbertos = Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados);
    return {
      contatosAbertos,
      taxaFechamento: data.total_contatos > 0 ? (data.total_fechados / data.total_contatos) * 100 : 0,
      taxaSimpatia: data.total_contatos > 0 ? (data.total_simpatizantes / data.total_contatos) * 100 : 0,
      mediaPorCoordenador: data.total_coordenadores > 0 ? Math.round(data.total_contatos / data.total_coordenadores) : 0,
      mediaPorLider: data.total_lideres > 0 ? Math.round(data.total_contatos / data.total_lideres) : 0,
    };
  }, [data]);

  const alertasExecutivos = useMemo<AlertaExecutivo[]>(() => {
    if (!data) return [];

    const alertas: AlertaExecutivo[] = [];
    const regioesFracas = data.por_regiao
      .filter((item) => item.total > 0)
      .map((item) => ({ ...item, conversao: item.total > 0 ? (item.fechados / item.total) * 100 : 0 }))
      .filter((item) => item.conversao < 10)
      .sort((a, b) => a.conversao - b.conversao);
    const coordenadoresPoucosLideres = data.por_coordenador
      .filter((item) => item.total > 0 && item.lideres <= 1)
      .sort((a, b) => a.lideres - b.lideres || b.total - a.total);
    const coordenadoresBaixaConversao = data.por_coordenador
      .filter((item) => item.total >= 40)
      .map((item) => ({ ...item, conversao: item.total > 0 ? (item.fechados / item.total) * 100 : 0 }))
      .filter((item) => item.conversao < 12)
      .sort((a, b) => a.conversao - b.conversao);

    if (regioesFracas[0]) {
      alertas.push({
        titulo: "Bairro com baixa conversão",
        detalhe: `${regioesFracas[0].regiao_nome || "Sem nome"} está com ${formatPercent(regioesFracas[0].conversao)} de fechados.`,
        tone: "red",
        href: regioesFracas[0].regiao_id ? `/regioes/${regioesFracas[0].regiao_id}` : "/regioes",
        acao: "Abrir bairro",
      });
    }

    if (coordenadoresPoucosLideres[0]) {
      alertas.push({
        titulo: "Equipe curta para a demanda",
        detalhe: `${coordenadoresPoucosLideres[0].coordenador_nome || "Coordenador"} tem ${coordenadoresPoucosLideres[0].lideres} líder(es) para ${coordenadoresPoucosLideres[0].total} pessoas.`,
        tone: "yellow",
        href: "/usuarios",
        acao: "Abrir equipe",
      });
    }

    if (coordenadoresBaixaConversao[0]) {
      alertas.push({
        titulo: "Coordenador precisa de apoio",
        detalhe: `${coordenadoresBaixaConversao[0].coordenador_nome || "Coordenador"} converteu ${formatPercent(coordenadoresBaixaConversao[0].conversao)} da base.`,
        tone: "blue",
        href: "/usuarios",
        acao: "Ver coordenadores",
      });
    }

    if (!alertas.length && data.alertas[0]) {
      alertas.push({ titulo: "Acompanhamento geral", detalhe: data.alertas[0], tone: "blue", acao: "Ver bairros" });
    }

    return alertas;
  }, [data]);

  const rankingCoordenadores = useMemo(() => {
    if (!data) return [];
    return data.por_coordenador
      .filter((item) => item.total > 0)
      .map((item) => ({ ...item, conversao: item.total > 0 ? (item.fechados / item.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data]);

  const lideresEmDestaque = useMemo(() => {
    if (!data) return [];
    return data.ranking_lideres
      .filter((item) => item.total > 0)
      .map((item) => ({ ...item, conversao: item.total > 0 ? (item.fechados / item.total) * 100 : 0 }))
      .slice(0, 5);
  }, [data]);

  const regioesPrioritarias = useMemo(() => {
    if (!data) return [];
    return data.por_regiao
      .filter((item) => item.total > 0)
      .map((item) => ({ ...item, conversao: item.total > 0 ? (item.fechados / item.total) * 100 : 0 }))
      .sort((a, b) => {
        const order = { prioritaria: 0, atencao: 1, normal: 2 } as Record<string, number>;
        return (order[a.prioridade || "normal"] ?? 3) - (order[b.prioridade || "normal"] ?? 3) || b.total - a.total;
      })
      .slice(0, 6);
  }, [data]);

  const visualOverview = useMemo(() => {
    if (!data) return null;
    return {
      distribuicao: [
        { name: "Contatos", value: Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados), color: "#94a3b8" },
        { name: "Simpatizantes", value: data.total_simpatizantes, color: "#f59e0b" },
        { name: "Fechados", value: data.total_fechados, color: "#10b981" },
      ].filter((item) => item.value > 0),
      coordenadores: rankingCoordenadores.map((item) => ({
        nome: item.coordenador_nome?.split(" ")[0] || "Coord.",
        total: item.total,
        fechados: item.fechados,
      })),
    };
  }, [data, rankingCoordenadores]);

  const handleReorder = (order: BlockId[]) => {
    setBlockOrder(order);
    saveOrder(order);
  };

  const renderBlock = (blockId: BlockId) => {
    if (!data || !visualOverview || !resumoExecutivo) return null;

    if (blockId === "decisao" && alertasExecutivos.length > 0) {
      return (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-900">O que pede decisão agora</p>
          <p className="text-xs text-gray-500 mt-1 mb-3">Leitura rápida para orientar sua agenda e a cobrança da equipe.</p>
          <div className="space-y-3">
            {alertasExecutivos.map((alerta, index) => {
              const toneMap = {
                red: "bg-red-50 border-red-200 text-red-800",
                yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
                blue: "bg-blue-50 border-blue-200 text-blue-800",
              } as const;

              return (
                <button
                  key={`${alerta.titulo}-${index}`}
                  onClick={() => alerta.href && navigate(alerta.href)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 ${toneMap[alerta.tone]}`}
                >
                  <p className="text-sm font-bold">{alerta.titulo}</p>
                  <p className="text-xs mt-1 opacity-90">{alerta.detalhe}</p>
                  {alerta.acao && <p className="text-xs font-semibold mt-3">{alerta.acao} →</p>}
                </button>
              );
            })}
          </div>
        </Card>
      );
    }

    if (blockId === "visao") {
      return (
        <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-4">
          <Card className="p-4">
            <p className="text-sm font-semibold text-gray-900">Panorama visual</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Distribuição da base de apoio.</p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Distribuição da base</p>
              <Suspense fallback={<ChartLoadingBox />}>
                <BaseDistribuicaoChart data={visualOverview.distribuicao} />
              </Suspense>
              <div className="space-y-2 mt-2">
                {visualOverview.distribuicao.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                    <span className="ml-auto font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-semibold text-gray-900">Leitura rápida da equipe</p>
            <p className="text-xs text-gray-500 mt-1">Capacidade média e taxa de fechamento.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Média por coordenador</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{resumoExecutivo.mediaPorCoordenador}</p>
                <p className="text-xs text-gray-500 mt-1">pessoas por coordenador</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Média por líder</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{resumoExecutivo.mediaPorLider}</p>
                <p className="text-xs text-gray-500 mt-1">pessoas por líder</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Taxa de fechamento</p>
                <p className="text-3xl font-black text-green-600 mt-2">{formatPercent(resumoExecutivo.taxaFechamento)}</p>
                <p className="text-xs text-blue-700 mt-1">parcela da base já fechada</p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    if (blockId === "coordenadores") {
      return (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Produtividade dos coordenadores</p>
              <p className="text-xs text-gray-500">Comparação visual da base e dos fechados.</p>
            </div>
            <button onClick={() => navigate("/usuarios")} className="text-xs font-semibold text-blue-700">Ver equipe</button>
          </div>
          <Suspense fallback={<ChartLoadingBox height={260} />}>
            <CoordenadoresComparativoChart data={visualOverview.coordenadores} primary={primary} />
          </Suspense>
        </Card>
      );
    }

    if (blockId === "lideres") {
      return (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Líderes em destaque</p>
              <p className="text-xs text-gray-500">Base ativa e capacidade de conversão na ponta.</p>
            </div>
            <button onClick={() => navigate("/usuarios")} className="text-xs font-semibold text-blue-700">Ver líderes</button>
          </div>
          <div className="space-y-2">
            {lideresEmDestaque.map((item, index) => (
              <div key={item.lider_id ?? index} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.lider_nome || "Líder"}</p>
                  <p className="text-xs text-gray-500">
                    {Math.max(0, item.total - item.simpatizantes - item.fechados)} contatos, {item.simpatizantes} simpatizantes, {item.fechados} fechados
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-green-600">{formatPercent(item.conversao)}</p>
                  <p className="text-[11px] text-gray-400">conversão</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (blockId === "regioes") {
      return (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Bairros para acompanhar</p>
              <p className="text-xs text-gray-500">Leitura territorial com prioridade e conversão.</p>
            </div>
            <button onClick={() => navigate("/regioes")} className="text-xs font-semibold text-blue-700">Ver todos</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {regioesPrioritarias.map((item, index) => {
              const prioridade = getPrioridadeConfig(item.prioridade);
              const progress = Math.max(4, Math.round(item.conversao));

              return (
                <button
                  key={item.regiao_id ?? index}
                  onClick={() => item.regiao_id && navigate(`/regioes/${item.regiao_id}`)}
                  className="text-left rounded-2xl border border-gray-100 px-4 py-3 hover:border-gray-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.regiao_nome || "Região"}</p>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${prioridade.pill}`}>{prioridade.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {Math.max(0, item.total - item.simpatizantes - item.fechados)} contatos, {item.lideres} líderes, {item.fechados} fechados
                  </p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>Conversão</span>
                      <span>{formatPercent(item.conversao)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      );
    }

    if (blockId === "eventos" && data.proximos_eventos.length > 0) {
      return (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Próximos eventos</p>
              <p className="text-xs text-gray-500">Agenda mais próxima da campanha.</p>
            </div>
            <button onClick={() => navigate("/agenda")} className="text-xs font-semibold text-blue-700">Ver agenda</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {data.proximos_eventos.slice(0, 4).map((evento) => (
              <div key={evento.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">{evento.titulo}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(`${evento.data}T12:00:00`).toLocaleDateString("pt-BR")}
                  {evento.hora ? ` • ${evento.hora.slice(0, 5)}` : ""}
                  {evento.local ? ` • ${evento.local}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    return null;
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-8 sm:p-6">
        <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center gap-4">
            <CampanhaAvatar
              nome={campaignName}
              logo={config.logo}
              foto={config.foto_principal}
              alt={campaignName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
              fallbackClassName="bg-white/20 flex items-center justify-center"
              textClassName="text-lg font-black text-white"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Painel do vereador</p>
              <h1 className="text-2xl font-black truncate">{campaignName}</h1>
            </div>
            <button
              onClick={() => setIsEditing((current) => !current)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isEditing ? "bg-white text-gray-800" : "bg-white/20 text-white"}`}
              title="Organizar painel"
            >
              {isEditing ? "OK" : "::"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isEditing && (
            <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}>
              <Card className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Organizar painel</p>
                    <p className="text-xs text-gray-500">Segure os blocos abaixo para mudar a ordem de visualização.</p>
                  </div>
                  <button onClick={() => { setBlockOrder(DEFAULT_ORDER); saveOrder(DEFAULT_ORDER); }} className="text-xs font-semibold px-3 py-2 rounded-full bg-gray-100 text-gray-700">
                    Ordem padrão
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: primary, borderTopColor: "transparent" }} />
            <p className="text-sm text-gray-400 mt-3">Carregando painel...</p>
          </div>
        )}

        {data && resumoExecutivo && (
          <>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Resumo executivo</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Hoje a campanha tem {data.total_contatos} pessoas: {resumoExecutivo.contatosAbertos} contatos, {data.total_simpatizantes} simpatizantes e {data.total_fechados} fechados, em {data.total_regioes} bairros.
                  </p>
                </div>
                </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <ResumoCard label="Base total" value={data.total_contatos} hint="Soma de contatos, simpatizantes e fechados" color="text-blue-700" />
                <ResumoCard label="Contatos" value={resumoExecutivo.contatosAbertos} hint="Ainda sem apoio declarado" color="text-slate-600" onClick={() => navigate("/contatos?nivel=contato")} />
                <ResumoCard label="Fechados" value={data.total_fechados} hint={`${formatPercent(resumoExecutivo.taxaFechamento)} da base`} color="text-green-600" onClick={() => navigate("/contatos?nivel=fechado")} />
                <ResumoCard label="Simpatizantes" value={data.total_simpatizantes} hint={`${formatPercent(resumoExecutivo.taxaSimpatia)} da base`} color="text-yellow-600" onClick={() => navigate("/contatos?nivel=simpatizante")} />
                <ResumoCard
                  label="Equipe"
                  value={`${data.total_coordenadores}/${data.total_lideres}`}
                  hint="coordenadores / líderes"
                  color="text-indigo-600"
                  onClick={() => navigate("/usuarios")}
                />
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
              <ActionButton label="Ver bairros" hint="Entrar nos bairros que pedem ação" onClick={() => navigate("/regioes")} />
              <ActionButton label="Ver agenda" hint="Olhar os próximos compromissos" onClick={() => navigate("/agenda")} />
            </div>

            <Reorder.Group axis="y" values={blockOrder} onReorder={handleReorder} className="space-y-4" as="div">
              {blockOrder.map((blockId) => {
                const content = renderBlock(blockId);
                if (!content) return null;
                return (
                  <SortableBlock key={blockId} id={blockId} isEditing={isEditing} primary={primary}>
                    {content}
                  </SortableBlock>
                );
              })}
            </Reorder.Group>
          </>
        )}

        {data?.total_contatos === 0 && (
          <Card className="p-8 text-center text-gray-500">
            <p className="text-lg font-bold text-gray-800">A campanha ainda está vazia</p>
            <p className="text-sm mt-2">Estruture a equipe e acompanhe o crescimento da base por aqui.</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}

