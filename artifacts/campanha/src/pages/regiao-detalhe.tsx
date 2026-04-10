import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import ConversionThermometer from "@/components/ConversionThermometer";
import Layout from "@/components/Layout";
import NiveisLegenda from "@/components/NiveisLegenda";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getPrioridadeConfig } from "@/lib/prioridade";

interface Regiao {
  id: number;
  nome: string;
  descricao: string | null;
  coordenador_nome: string | null;
  cor: string;
  prioridade: string;
  observacao_estrategica: string | null;
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
  total_coordenadores: number;
  coordenadores: { id: number; nome: string; telefone: string | null; ativo: boolean }[];
  lideres: { lider_id: number | null; lider_nome: string | null; total: number; simpatizantes: number; fechados: number }[];
  observacoes: { id: number; autor_nome: string | null; observacao: string; created_at: string }[];
  proximos_eventos: { id: number; titulo: string; data: string; hora: string | null; tipo_evento: string }[];
}

export default function RegiaoDetalhePage() {
  const params = useParams();
  const id = Number(params.id);
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaObs, setNovaObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [, navigate] = useLocation();
  const { usuario } = useAuth();

  const canChangePriority = ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "");
  const canAddObs = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const canDeleteRegion = ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "");

  const load = () => {
    setLoading(true);
    apiGet<Regiao>(`/api/regioes/${id}`)
      .then(setRegiao)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const pct = useMemo(() => {
    if (!regiao || !regiao.total_contatos) return 0;
    return Math.round((regiao.total_fechados / regiao.total_contatos) * 100);
  }, [regiao]);

  const totalContatosAbertos = useMemo(() => {
    if (!regiao) return 0;
    return Math.max(regiao.total_contatos - regiao.total_simpatizantes - regiao.total_fechados, 0);
  }, [regiao]);

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

  const deleteRegiao = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este bairro?")) return;
    await apiDelete(`/api/regioes/${id}`);
    navigate("/regioes");
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!regiao) {
    return (
      <Layout>
        <div className="p-4 text-center text-gray-500">Bairro não encontrado</div>
      </Layout>
    );
  }

  const cfg = getPrioridadeConfig(regiao.prioridade);

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => navigate("/regioes")} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
          ← Voltar para bairros
        </button>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: regiao.cor }} />
              <h1 className="text-2xl font-bold text-gray-900 truncate">{regiao.nome}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {regiao.total_coordenadores > 0
                ? `${regiao.total_coordenadores} coordenador(es) e ${regiao.total_lideres} líder(es) atuando neste bairro`
                : "Nenhum coordenador vinculado ainda"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            {canDeleteRegion && (
              <button
                onClick={deleteRegiao}
                className="text-xs px-2 py-1 rounded-full font-medium bg-red-50 text-red-700 hover:bg-red-100"
              >
                Excluir
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { label: "Total de pessoas", value: regiao.total_contatos, color: "text-blue-600" },
            { label: "Contatos", value: totalContatosAbertos, color: "text-violet-700" },
            { label: "Simpat.", value: regiao.total_simpatizantes, color: "text-yellow-600" },
            { label: "Fechados", value: regiao.total_fechados, color: "text-green-600" },
            { label: "Líderes", value: regiao.total_lideres, color: "text-purple-600" },
            { label: "Coord.", value: regiao.total_coordenadores, color: "text-indigo-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Legenda da situação das pessoas</p>
          <NiveisLegenda />
        </div>

        <div className="mb-4">
          <ConversionThermometer
            title="Fechados deste bairro"
            percent={pct}
            ratioText={`${regiao.total_fechados} de ${regiao.total_contatos} fechados`}
            onAction={() => navigate(`/contatos?nivel=simpatizante&regiao_id=${id}`)}
          />
        </div>

        {canChangePriority && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Prioridade do bairro</p>
            <div className="flex gap-2">
              {(["normal", "atencao", "prioritaria"] as const).map((prioridade) => (
                <button
                  key={prioridade}
                  onClick={() => changePrioridade(prioridade)}
                  className={`flex-1 text-xs py-2 rounded-xl font-semibold transition-all ${
                    regiao.prioridade === prioridade
                      ? prioridade === "prioritaria"
                        ? "bg-red-600 text-white"
                        : prioridade === "atencao"
                          ? "bg-yellow-500 text-white"
                          : "bg-gray-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {prioridade === "normal" ? "Normal" : prioridade === "atencao" ? "Atenção" : "Prioritária"}
                </button>
              ))}
            </div>
          </div>
        )}

        {regiao.coordenadores.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Responsáveis pelo bairro</h2>
            <div className="space-y-2">
              {regiao.coordenadores.map((coordenador) => (
                <div key={coordenador.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{coordenador.nome}</p>
                    <p className="text-xs text-gray-400">{coordenador.telefone || "Sem telefone"}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      coordenador.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {coordenador.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {regiao.lideres.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Líderes do bairro</h2>
            <div className="space-y-2">
              {regiao.lideres.map((lider, index) => (
                <div key={lider.lider_id ?? index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{lider.lider_nome || "-"}</p>
                    <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                      <span>Simpatizantes: {lider.simpatizantes}</span>
                      <span>Fechados: {lider.fechados}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{lider.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {regiao.proximos_eventos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Próximos eventos do bairro</h2>
            {regiao.proximos_eventos.map((evento) => (
              <div key={evento.id} className="flex gap-3 p-3 bg-blue-50 rounded-xl mb-2 last:mb-0">
                <div className="bg-blue-100 rounded-lg p-1.5 min-w-[48px] text-center">
                  <p className="text-xs text-blue-700 font-bold">
                    {new Date(`${evento.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                  {evento.hora && <p className="text-xs text-gray-500">{evento.hora.slice(0, 5)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Observações estratégicas</h2>
              <p className="text-xs text-gray-500 mt-1">
                Use este campo para registrar informações importantes sobre o bairro, como oportunidades, riscos e próximos passos.
              </p>
            </div>
          </div>
          {regiao.observacoes.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma observação registrada ainda.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {regiao.observacoes.map((obs) => (
                <div key={obs.id} className="bg-blue-50 rounded-xl p-3">
                  <p className="text-sm text-gray-800">{obs.observacao}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {obs.autor_nome || "Equipe"} • {new Date(obs.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {canAddObs && (
            <div className="space-y-2">
              <textarea
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                rows={3}
                placeholder="Registrar observação estratégica do bairro..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={addObservacao}
                disabled={savingObs || !novaObs.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {savingObs ? "Salvando..." : "Adicionar observação"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
