import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface RegiaoComStats {
  id: number;
  nome: string;
  descricao: string | null;
  coordenador_regional_id: number | null;
  coordenador_nome: string | null;
  cor: string;
  prioridade: "normal" | "atencao" | "prioritaria";
  observacao_estrategica: string | null;
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
}

const prioridadeConfig = {
  normal: { label: "Normal", color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200" },
  atencao: { label: "Atenção", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  prioritaria: { label: "Prioritária", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

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

  const prioritarias = regioes.filter(r => r.prioridade === "prioritaria");
  const atencao = regioes.filter(r => r.prioridade === "atencao");
  const normais = regioes.filter(r => r.prioridade === "normal");

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regiões</h1>
            <p className="text-sm text-gray-500">{regioes.length} regiões cadastradas</p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate("/regioes/nova")}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow active:scale-95 transition-transform"
            >
              + Nova
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && regioes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="font-medium">Nenhuma região cadastrada</p>
          </div>
        )}

        {/* Prioritárias */}
        {prioritarias.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">⚡ Prioritárias</p>
            <div className="space-y-3">
              {prioritarias.map(r => <RegiaoCard key={r.id} regiao={r} onClick={() => navigate(`/regioes/${r.id}`)} />)}
            </div>
          </div>
        )}

        {/* Atenção */}
        {atencao.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-2">⚠️ Em Atenção</p>
            <div className="space-y-3">
              {atencao.map(r => <RegiaoCard key={r.id} regiao={r} onClick={() => navigate(`/regioes/${r.id}`)} />)}
            </div>
          </div>
        )}

        {/* Normais */}
        {normais.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Demais Regiões</p>
            <div className="space-y-3">
              {normais.map(r => <RegiaoCard key={r.id} regiao={r} onClick={() => navigate(`/regioes/${r.id}`)} />)}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function RegiaoCard({ regiao, onClick }: { regiao: RegiaoComStats; onClick: () => void }) {
  const cfg = prioridadeConfig[regiao.prioridade];
  const pct = regiao.total_contatos > 0 ? Math.round((regiao.total_fechados / regiao.total_contatos) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer active:scale-[0.98] transition-transform ${cfg.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: regiao.cor }} />
          <div>
            <h3 className="font-bold text-gray-900">{regiao.nome}</h3>
            {regiao.coordenador_nome && <p className="text-xs text-gray-400">👤 {regiao.coordenador_nome}</p>}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{regiao.total_contatos}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-600">{regiao.total_simpatizantes}</p>
          <p className="text-xs text-gray-400">Simpatiz.</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{regiao.total_fechados}</p>
          <p className="text-xs text-gray-400">Fechados</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">{regiao.total_lideres}</p>
          <p className="text-xs text-gray-400">Líderes</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Conversão</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
