import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";

interface StatsLider {
  lider_id: number | null;
  lider_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
}

interface DashboardCoordenador {
  total_base: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_lideres: number;
  ranking_lideres: StatsLider[];
}

export default function DashboardCoordenadorPage() {
  const [data, setData] = useState<DashboardCoordenador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<DashboardCoordenador>("/api/dashboard/coordenador")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Minha Equipe</h1>
          <p className="text-sm text-gray-500">Visão geral da coordenação</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-blue-600">{data.total_base}</p>
                <p className="text-xs text-gray-600 mt-1">Total da Base</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-gray-700">{data.total_lideres}</p>
                <p className="text-xs text-gray-600 mt-1">Líderes Ativos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-yellow-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-yellow-600">{data.total_simpatizantes}</p>
                <p className="text-xs text-gray-600 mt-1">Simpatizantes</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-green-600">{data.total_fechados}</p>
                <p className="text-xs text-gray-600 mt-1">Fechados</p>
              </div>
            </div>

            {/* Ranking */}
            {data.ranking_lideres.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Ranking dos Líderes</h2>
                <div className="space-y-2">
                  {data.ranking_lideres.map((lider, index) => (
                    <div
                      key={lider.lider_id ?? index}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-600" :
                          index === 2 ? "bg-orange-50 text-orange-600" :
                          "bg-blue-50 text-blue-600"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {lider.lider_nome || "Sem líder"}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{lider.total}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500 pl-11">
                        <span>🟡 {lider.simpatizantes} simpatizantes</span>
                        <span>🟢 {lider.fechados} fechados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.ranking_lideres.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">👥</p>
                <p className="text-sm">Nenhum contato cadastrado ainda</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
