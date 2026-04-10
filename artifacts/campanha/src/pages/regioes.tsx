import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import NiveisLegenda from "@/components/NiveisLegenda";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getPrioridadeBucket, getPrioridadeConfig } from "@/lib/prioridade";

interface RegiaoComStats {
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
}

export default function RegioesPage() {
  const [regioes, setRegioes] = useState<RegiaoComStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { usuario } = useAuth();

  const canCreate = ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "");

  useEffect(() => {
    apiGet<RegiaoComStats[]>("/api/regioes")
      .then(setRegioes)
      .finally(() => setLoading(false));
  }, []);

  const resumo = useMemo(() => {
    const totalCoordenadores = regioes.reduce((sum, regiao) => sum + regiao.total_coordenadores, 0);
    const totalLideres = regioes.reduce((sum, regiao) => sum + regiao.total_lideres, 0);
    const totalPessoas = regioes.reduce((sum, regiao) => sum + regiao.total_contatos, 0);
    const regioesCriticas = regioes.filter((regiao) => getPrioridadeBucket(regiao.prioridade) !== "normal").length;

    return {
      totalCoordenadores,
      totalLideres,
      totalPessoas,
      regioesCriticas,
    };
  }, [regioes]);

  const grupos = useMemo(() => {
    const criticas = regioes.filter((regiao) => getPrioridadeBucket(regiao.prioridade) === "prioritaria");
    const atencao = regioes.filter((regiao) => getPrioridadeBucket(regiao.prioridade) === "atencao");
    const estaveis = regioes.filter((regiao) => getPrioridadeBucket(regiao.prioridade) === "normal");

    return { criticas, atencao, estaveis };
  }, [regioes]);

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bairros</h1>
            <p className="text-sm text-gray-500">{regioes.length} bairros em acompanhamento</p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate("/regioes/nova")}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow active:scale-95 transition-transform"
            >
              + Escolher bairros
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-1">Como a campanha está distribuída</p>
          <p className="text-xs text-gray-500 mb-3">
            Cada bairro pode ter um ou mais coordenadores. Cada coordenador pode ter vários líderes.
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Stat value={regioes.length} label="Bairros" color="text-gray-800" />
            <Stat value={resumo.totalCoordenadores} label="Coorden." color="text-indigo-600" />
            <Stat value={resumo.totalLideres} label="Líderes" color="text-purple-600" />
            <Stat value={resumo.regioesCriticas} label="Atenção" color="text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mt-3">{resumo.totalPessoas} pessoas distribuídas entre os bairros.</p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Legenda da situação das pessoas</p>
          <NiveisLegenda />
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && regioes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="font-medium">Nenhum bairro cadastrado</p>
          </div>
        )}

        {grupos.criticas.length > 0 && (
          <Section
            title="Bairros que pedem ação agora"
            subtitle="São as áreas mais sensíveis da campanha neste momento."
            titleClassName="text-red-600"
            regioes={grupos.criticas}
            onClick={(targetId) => navigate(`/regioes/${targetId}`)}
          />
        )}

        {grupos.atencao.length > 0 && (
          <Section
            title="Bairros em atenção"
            subtitle="Precisam de acompanhamento mais próximo e reforço da equipe."
            titleClassName="text-amber-600"
            regioes={grupos.atencao}
            onClick={(targetId) => navigate(`/regioes/${targetId}`)}
          />
        )}

        {grupos.estaveis.length > 0 && (
          <Section
            title="Demais bairros"
            subtitle="Áreas estáveis para seguir acompanhando."
            titleClassName="text-gray-500"
            regioes={grupos.estaveis}
            onClick={(targetId) => navigate(`/regioes/${targetId}`)}
          />
        )}
      </div>
    </Layout>
  );
}

function Section({
  title,
  subtitle,
  titleClassName,
  regioes,
  onClick,
}: {
  title: string;
  subtitle: string;
  titleClassName: string;
  regioes: RegiaoComStats[];
  onClick: (id: number) => void;
}) {
  return (
    <div className="mb-5">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${titleClassName}`}>{title}</p>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      <div className="space-y-3">
        {regioes.map((regiao) => (
          <RegiaoCard key={regiao.id} regiao={regiao} onClick={() => onClick(regiao.id)} />
        ))}
      </div>
    </div>
  );
}

function RegiaoCard({ regiao, onClick }: { regiao: RegiaoComStats; onClick: () => void }) {
  const cfg = getPrioridadeConfig(regiao.prioridade);
  const pct = regiao.total_contatos > 0 ? Math.round((regiao.total_fechados / regiao.total_contatos) * 100) : 0;
  const contatosAbertos = Math.max(regiao.total_contatos - regiao.total_simpatizantes - regiao.total_fechados, 0);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border active:scale-[0.98] transition-transform ${cfg.border}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: regiao.cor }} />
            <h3 className="font-bold text-gray-900 truncate">{regiao.nome}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {regiao.coordenador_nome
              ? regiao.total_coordenadores > 1
                ? `${regiao.total_coordenadores} coordenadores: ${regiao.coordenador_nome}`
                : `Coordenador: ${regiao.coordenador_nome}`
              : "Nenhum coordenador vinculado"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {regiao.total_lideres} líderes e {regiao.total_contatos} pessoas vinculadas
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        <Stat value={regiao.total_contatos} label="Total de pessoas" color="text-gray-800" />
        <Stat value={contatosAbertos} label="Contatos" color="text-violet-700" />
        <Stat value={regiao.total_simpatizantes} label="Simpat." color="text-yellow-600" />
        <Stat value={regiao.total_fechados} label="Fechados" color="text-green-600" />
        <Stat value={regiao.total_lideres} label="Líderes" color="text-purple-600" />
        <Stat value={regiao.total_coordenadores} label="Coord." color="text-indigo-600" />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Conversão para fechados</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
