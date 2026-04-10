import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useCampanha } from "@/contexts/CampanhaContext";
import { getCampaignDisplayName } from "@/lib/campanha";
import { getPrioridadeConfig } from "@/lib/prioridade";

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
  coordenador_nome: string | null;
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
}

interface DashboardCoordenadorGeral {
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function KpiCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: number | string;
  hint: string;
  color: string;
}) {
  const effectiveHint = label === "Base total" ? "Soma de contatos, simpatizantes e fechados" : hint;

  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-3xl font-black mt-2 ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{effectiveHint}</p>
    </Card>
  );
}

function ActionCard({
  title,
  hint,
  onClick,
  primary = false,
}: {
  title: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-colors ${
        primary ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-800 hover:border-gray-300"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className={`text-xs mt-1 ${primary ? "text-white/80" : "text-gray-500"}`}>{hint}</p>
      <p className={`text-xs font-semibold mt-3 ${primary ? "text-white" : "text-blue-700"}`}>Abrir</p>
    </button>
  );
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default function DashboardCoordenadorGeralPage() {
  const [data, setData] = useState<DashboardCoordenadorGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { config } = useCampanha();
  const campaignName = getCampaignDisplayName(config.nome_candidato);
  const primary = config.cor_primaria || "#1d4ed8";
  const secondary = config.cor_secundaria || "#1e40af";

  useEffect(() => {
    apiGet<DashboardCoordenadorGeral>("/api/dashboard/coordenador-geral")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    if (!data) return null;

    const taxaFechamento = percent(data.total_fechados, data.total_contatos);
    const taxaSimpatia = percent(data.total_simpatizantes, data.total_contatos);
    const mediaPorCoordenador = data.total_coordenadores > 0 ? Math.round(data.total_contatos / data.total_coordenadores) : 0;
    const mediaPorLider = data.total_lideres > 0 ? Math.round(data.total_contatos / data.total_lideres) : 0;

    const coordenadores = data.por_coordenador
      .filter((item) => item.total > 0)
      .map((item) => {
        const conversao = percent(item.fechados, item.total);
        const mediaPorLiderItem = item.lideres > 0 ? Math.round(item.total / item.lideres) : item.total;
        return {
          ...item,
          conversao,
          mediaPorLider: mediaPorLiderItem,
        };
      });

    const coordenadoresPoucaEquipe = coordenadores.filter((item) => item.lideres <= 1).sort((a, b) => b.total - a.total);

    const coordenadoresBaixaConversao = coordenadores
      .filter((item) => item.total >= 40)
      .sort((a, b) => a.conversao - b.conversao);

    const bairros = data.por_regiao
      .filter((item) => item.total > 0)
      .map((item) => ({
        ...item,
        conversao: percent(item.fechados, item.total),
      }));

    const bairrosCriticos = bairros
      .filter((item) => item.prioridade === "prioritaria" || item.conversao < 10)
      .sort((a, b) => {
        const order = { prioritaria: 0, atencao: 1, normal: 2 } as Record<string, number>;
        return (order[a.prioridade || "normal"] ?? 3) - (order[b.prioridade || "normal"] ?? 3) || a.conversao - b.conversao;
      });

    const lideres = data.ranking_lideres
      .filter((item) => item.total > 0)
      .map((item) => ({
        ...item,
        conversao: percent(item.fechados, item.total),
      }));

    const semanas = data.evolucao_semanal;
    const semanaAtual = semanas[semanas.length - 1];
    const semanaAnterior = semanas[semanas.length - 2];
    const variacaoSemanal =
      semanaAtual && semanaAnterior ? semanaAtual.total - semanaAnterior.total : data.crescimento_semana;

    return {
      taxaFechamento,
      taxaSimpatia,
      mediaPorCoordenador,
      mediaPorLider,
      coordenadores,
      coordenadoresPoucaEquipe,
      coordenadoresBaixaConversao,
      bairrosCriticos,
      lideres,
      variacaoSemanal,
    };
  }, [data]);

  const alertasTecnicos = useMemo(() => {
    if (!data || !analytics) return [];

    const alertas: Array<{ title: string; detail: string; href: string; action: string }> = [];

    if (analytics.coordenadoresPoucaEquipe[0]) {
      const item = analytics.coordenadoresPoucaEquipe[0];
      alertas.push({
        title: "Coordenador com equipe curta",
        detail: `${item.coordenador_nome || "Coordenador"} tem ${item.lideres} líder(es) para ${item.total} pessoas.`,
        href: "/usuarios",
        action: "Abrir equipe",
      });
    }

    if (analytics.coordenadoresBaixaConversao[0]) {
      const item = analytics.coordenadoresBaixaConversao[0];
      alertas.push({
        title: "Baixa conversão na coordenação",
        detail: `${item.coordenador_nome || "Coordenador"} está com ${formatPercent(item.conversao)} de fechados.`,
        href: "/usuarios",
        action: "Ver coordenadores",
      });
    }

    if (analytics.bairrosCriticos[0]) {
      const item = analytics.bairrosCriticos[0];
      alertas.push({
        title: "Bairro pede acompanhamento",
        detail: `${item.regiao_nome || "Bairro"} está com ${formatPercent(item.conversao)} de conversão.`,
        href: item.regiao_id ? `/regioes/${item.regiao_id}` : "/regioes",
        action: "Abrir bairro",
      });
    }

    for (const alerta of data.alertas.slice(0, 2)) {
      if (!alertas.some((item) => item.detail === alerta)) {
        alertas.push({
          title: "Monitoramento geral",
          detail: alerta,
          href: "/regioes",
          action: "Ver bairros",
        });
      }
    }

    return alertas.slice(0, 4);
  }, [analytics, data]);

  const contatosAbertos = data
    ? Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados)
    : 0;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-8 sm:p-6">
        <div
          className="rounded-3xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
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
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Painel técnico da coordenação geral</p>
              <h1 className="text-2xl font-black truncate">{campaignName}</h1>
              <p className="text-sm text-white/80 mt-1">
                Acompanhe produtividade da equipe, gargalos da operação e prioridade por bairro.
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div
              className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: primary, borderTopColor: "transparent" }}
            />
            <p className="text-sm text-gray-400 mt-3">Carregando painel técnico...</p>
          </div>
        )}

        {data && analytics && (
          <>
            <div className="grid md:grid-cols-6 gap-3">
              <KpiCard
                label="Base total"
                value={data.total_contatos}
                hint={`+${data.crescimento_semana} na última semana`}
                color="text-blue-700"
              />
              <KpiCard
                label="Contatos"
                value={contatosAbertos}
                hint="Ainda sem apoio declarado"
                color="text-slate-600"
              />
              <KpiCard
                label="Simpatizantes"
                value={data.total_simpatizantes}
                hint={`${formatPercent(analytics.taxaSimpatia)} da base`}
                color="text-yellow-600"
              />
              <KpiCard
                label="Fechados"
                value={data.total_fechados}
                hint={`${formatPercent(analytics.taxaFechamento)} da base`}
                color="text-green-600"
              />
              <KpiCard
                label="Coordenadores"
                value={data.total_coordenadores}
                hint={`${analytics.mediaPorCoordenador} pessoas por coordenador`}
                color="text-indigo-600"
              />
              <KpiCard
                label="Líderes"
                value={data.total_lideres}
                hint={`${analytics.mediaPorLider} pessoas por líder`}
                color="text-purple-600"
              />
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              <ActionCard
                title="Novo coordenador"
                hint="Abrir cadastro direto de coordenador"
                onClick={() => navigate("/usuarios?novo=coordenador")}
                primary
              />
              <ActionCard
                title="Ver equipe"
                hint="Analisar coordenadores e líderes"
                onClick={() => navigate("/usuarios")}
              />
              <ActionCard
                title="Ver bairros"
                hint="Acompanhar bairros e prioridade"
                onClick={() => navigate("/regioes")}
              />
              <ActionCard
                title="Ver pessoas"
                hint="Acompanhar contatos, simpatizantes e fechados"
                onClick={() => navigate("/contatos")}
              />
            </div>

            {alertasTecnicos.length > 0 && (
              <Card className="p-4 border-amber-200 bg-amber-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-950">Pontos de atenção da operação</p>
                    <p className="text-xs text-amber-900/80 mt-1">Use isso para priorizar cobrança, redistribuição de equipe e agenda.</p>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    Prioridade
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  {alertasTecnicos.map((alerta, index) => (
                    <button
                      key={`${alerta.title}-${index}`}
                      onClick={() => navigate(alerta.href)}
                      className="text-left rounded-2xl border border-amber-200 bg-white px-4 py-3 transition-colors hover:bg-amber-50"
                    >
                      <p className="text-sm font-bold text-amber-900">{alerta.title}</p>
                      <p className="text-xs text-amber-800 mt-1">{alerta.detail}</p>
                      <p className="text-xs font-semibold text-amber-900 mt-3">{alerta.action} →</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-4 ring-1 ring-blue-100">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Produtividade por coordenador</p>
                    <p className="text-xs text-gray-500">Base, equipe, conversão e distribuição de carga.</p>
                  </div>
                  <button onClick={() => navigate("/usuarios")} className="text-xs font-semibold text-blue-700">
                    Ver equipe
                  </button>
                </div>
                <div className="space-y-3">
                  {analytics.coordenadores.slice(0, 6).map((item, index) => (
                    <div key={item.coordenador_id ?? index} className="rounded-2xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.coordenador_nome || "Coordenador"}</p>
                          <p className="text-xs text-gray-500 truncate">{item.regiao_nome || "Sem bairro"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-blue-700">{item.total}</p>
                          <p className="text-[11px] text-gray-400">pessoas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
                        <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                          <span className="block font-black text-gray-800">{item.lideres}</span>
                          <span className="text-gray-500">líderes</span>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                          <span className="block font-black text-slate-600">{Math.max(0, item.total - item.simpatizantes - item.fechados)}</span>
                          <span className="text-gray-500">contatos</span>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                          <span className="block font-black text-yellow-600">{item.simpatizantes}</span>
                          <span className="text-gray-500">simpatizantes</span>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                          <span className="block font-black text-green-600">{item.fechados}</span>
                          <span className="text-gray-500">fechados</span>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                          <span className="block font-black text-indigo-600">{formatPercent(item.conversao)}</span>
                          <span className="text-gray-500">conversÃ£o</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-3">
                        Média de {item.mediaPorLider} pessoas por líder nesta coordenação.
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 ring-1 ring-green-100">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Bairros com foco operacional</p>
                    <p className="text-xs text-gray-500">Prioridade política somada a desempenho real.</p>
                  </div>
                  <button onClick={() => navigate("/regioes")} className="text-xs font-semibold text-blue-700">
                    Ver bairros
                  </button>
                </div>
                <div className="space-y-3">
                  {analytics.bairrosCriticos.slice(0, 6).map((item, index) => {
                    const prioridade = getPrioridadeConfig(item.prioridade);
                    return (
                      <button
                        key={item.regiao_id ?? index}
                        onClick={() => item.regiao_id && navigate(`/regioes/${item.regiao_id}`)}
                        className="w-full text-left rounded-2xl border border-gray-100 px-4 py-3 hover:border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-gray-900 truncate">{item.regiao_nome || "Bairro"}</p>
                              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${prioridade.pill}`}>
                                {prioridade.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.max(0, item.total - item.simpatizantes - item.fechados)} contatos, {item.lideres} líderes, {item.fechados} fechados
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-green-600">{formatPercent(item.conversao)}</p>
                            <p className="text-[11px] text-gray-400">conversão</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Líderes mais produtivos</p>
                    <p className="text-xs text-gray-500">Quem mais movimenta a ponta da campanha.</p>
                  </div>
                  <button onClick={() => navigate("/usuarios")} className="text-xs font-semibold text-blue-700">
                    Ver líderes
                  </button>
                </div>
                <div className="space-y-2">
                  {analytics.lideres.slice(0, 8).map((item, index) => (
                    <div key={item.lider_id ?? index} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.lider_nome || "Líder"}</p>
                        {item.coordenador_nome && (
                          <p className="text-xs text-indigo-500 truncate">Coordenador: {item.coordenador_nome}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {Math.max(0, item.total - item.simpatizantes - item.fechados)} contatos, {item.simpatizantes} simpatizantes, {item.fechados} fechados
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-green-600">{formatPercent(item.conversao)}</p>
                        <p className="text-[11px] text-gray-400">conv.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-gray-50/70">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Leitura rápida da semana</p>
                    <p className="text-xs text-gray-500">Resumo rápido de movimento e agenda.</p>
                  </div>
                  <button onClick={() => navigate("/agenda")} className="text-xs font-semibold text-blue-700">
                    Ver agenda
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Variação semanal</p>
                    <p className={`text-2xl font-black mt-2 ${analytics.variacaoSemanal >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {analytics.variacaoSemanal >= 0 ? "+" : ""}
                      {analytics.variacaoSemanal}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">comparado com a semana anterior</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Taxa de simpatia</p>
                    <p className="text-2xl font-black mt-2 text-yellow-600">{formatPercent(analytics.taxaSimpatia)}</p>
                    <p className="text-xs text-gray-500 mt-1">parcela da base em simpatizantes</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {data.proximos_eventos.slice(0, 4).map((evento) => (
                    <div key={evento.id} className="rounded-2xl bg-white px-4 py-3 border border-gray-100">
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
            </div>

            {data.total_contatos === 0 && (
              <Card className="p-8 text-center text-gray-500">
                <p className="text-lg font-bold text-gray-800">Ainda não há dados suficientes</p>
                <p className="text-sm mt-2">Cadastre a equipe e as primeiras pessoas para ativar o painel técnico.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
