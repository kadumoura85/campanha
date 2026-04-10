import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ConversionThermometer from "@/components/ConversionThermometer";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { getPrioridadeBucket, getPrioridadeConfig } from "@/lib/prioridade";

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
  regiao_id: number | null;
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

  const prioridadeBairro = getPrioridadeConfig(data?.regiao_prioridade);
  const bairroPrioritario =
    data?.regiao_prioridade && getPrioridadeBucket(data.regiao_prioridade) !== "normal";
  const totalContatosAbertos = data
    ? Math.max(0, data.total_base - data.total_simpatizantes - data.total_fechados)
    : 0;
  const taxaFechados = data?.total_base ? (data.total_fechados / data.total_base) * 100 : 0;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-8 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Painel do coordenador
            </p>
            <h1 className="text-3xl font-black text-slate-900">Meu bairro</h1>
            {data?.regiao_nome && (
              <p className="mt-1 text-base text-slate-500">Bairro acompanhado: {data.regiao_nome}</p>
            )}
          </div>
          {bairroPrioritario && prioridadeBairro ? (
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${prioridadeBairro.bg} ${prioridadeBairro.color}`}
            >
              Prioridade atual: {prioridadeBairro.label}
            </div>
          ) : (
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              Situação normal
            </div>
          )}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {data && (
          <>
            <div className="mb-5 rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 text-white shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-indigo-100">Total de pessoas no meu bairro</p>
                  <p className="mt-1 text-6xl font-black leading-none">{data.total_base}</p>
                  <p className="mt-3 max-w-xl text-sm text-indigo-100">
                    Esta é a soma de contatos, simpatizantes e fechados da sua área.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
                  <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <p className="text-3xl font-black text-slate-100">{totalContatosAbertos}</p>
                    <p className="mt-1 text-sm text-indigo-100">Contatos</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <p className="text-3xl font-black text-yellow-300">{data.total_simpatizantes}</p>
                    <p className="mt-1 text-sm text-indigo-100">Simpatizantes</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <p className="text-3xl font-black text-emerald-300">{data.total_fechados}</p>
                    <p className="mt-1 text-sm text-indigo-100">Fechados</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => navigate("/usuarios?novo=lider")}
                className="rounded-2xl bg-indigo-600 px-5 py-4 text-left text-white shadow transition-transform active:scale-[0.98]"
              >
                <p className="text-lg font-bold">Cadastrar líder</p>
                <p className="mt-1 text-sm text-indigo-100">Incluir um novo líder para a sua equipe.</p>
              </button>

              <button
                onClick={() => navigate("/contatos")}
                className="rounded-2xl bg-white px-5 py-4 text-left shadow-sm ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
              >
                <p className="text-lg font-bold text-slate-900">Ver contatos</p>
                <p className="mt-1 text-sm text-slate-500">Acompanhar as pessoas do seu time.</p>
              </button>

              <button
                onClick={() => navigate(data.regiao_id ? `/regioes/${data.regiao_id}` : "/regioes")}
                className="rounded-2xl bg-white px-5 py-4 text-left shadow-sm ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
              >
                <p className="text-lg font-bold text-slate-900">Meu bairro</p>
                <p className="mt-1 text-sm text-slate-500">Abrir o detalhe completo do seu bairro.</p>
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 p-5 shadow-sm ring-1 ring-indigo-100">
                <p className="text-4xl font-black text-indigo-600">{data.total_lideres}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">Líderes ativos</p>
                <p className="mt-1 text-xs text-slate-500">Pessoas da equipe atuando no bairro.</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5 shadow-sm ring-1 ring-emerald-100">
                <p className="text-4xl font-black text-emerald-600">{data.total_fechados}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">Votos fechados</p>
                <p className="mt-1 text-xs text-slate-500">Quem já declarou apoio com firmeza.</p>
              </div>
            </div>

            <div className="mb-5">
              <ConversionThermometer
                title="Fechados do meu bairro"
                percent={taxaFechados}
                ratioText={`${data.total_fechados} de ${data.total_base} fechados`}
                onAction={() =>
                  navigate(
                    data.regiao_id
                      ? `/contatos?nivel=simpatizante&regiao_id=${data.regiao_id}`
                      : "/contatos?nivel=simpatizante",
                  )
                }
              />
            </div>

            {data.ranking_lideres.length > 0 && (
              <section className="mb-5 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Meus líderes</h2>
                    <p className="text-sm text-slate-500">Quem mais movimenta a base da sua equipe.</p>
                  </div>
                  <button
                    onClick={() => navigate("/usuarios")}
                    className="text-sm font-semibold text-indigo-600"
                  >
                    Ver equipe
                  </button>
                </div>

                <div className="space-y-3">
                  {data.ranking_lideres.map((lider, index) => (
                    <div
                      key={lider.lider_id ?? index}
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                          index === 0 ? "bg-amber-200 text-amber-900" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-slate-900">
                          {lider.lider_nome || "Líder sem nome"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {Math.max(0, lider.total - lider.simpatizantes - lider.fechados)} contatos, {lider.simpatizantes} simpatizantes, {lider.fechados} fechados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-indigo-600">{lider.total}</p>
                        <p className="text-xs text-slate-400">pessoas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              {data.ultimas_movimentacoes.length > 0 && (
                <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Últimas movimentações</h2>
                      <p className="text-sm text-slate-500">Cadastros recentes e andamento da base.</p>
                    </div>
                    <button
                      onClick={() => navigate("/contatos")}
                      className="text-sm font-semibold text-indigo-600"
                    >
                      Ver tudo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data.ultimas_movimentacoes.map((contato) => {
                      const cfg = nivelConfig[contato.nivel] || nivelConfig.contato;
                      return (
                        <div
                          key={contato.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-900">{contato.nome}</p>
                            <p className="text-sm text-slate-500">
                              {contato.lider_nome ? `Líder: ${contato.lider_nome}` : "Sem líder informado"}
                              {contato.bairro ? ` • ${contato.bairro}` : ""}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {data.proximos_eventos.length > 0 && (
                <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Próximos eventos</h2>
                      <p className="text-sm text-slate-500">Compromissos do bairro nos próximos dias.</p>
                    </div>
                    <button
                      onClick={() => navigate("/agenda")}
                      className="text-sm font-semibold text-indigo-600"
                    >
                      Ver agenda
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data.proximos_eventos.map((evento) => (
                      <div key={evento.id} className="rounded-2xl bg-indigo-50 p-4">
                        <div className="flex gap-3">
                          <div className="min-w-[54px] rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                            <p className="text-xs font-black uppercase text-indigo-700">
                              {new Date(`${evento.data}T12:00:00`).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900">{evento.titulo}</p>
                            <p className="text-sm text-slate-500">
                              {evento.hora ? evento.hora.slice(0, 5) : "Horário a definir"}
                              {evento.local ? ` • ${evento.local}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
