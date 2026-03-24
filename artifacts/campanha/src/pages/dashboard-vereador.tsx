import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";

interface StatsCoordenador {
  coordenador_id: number | null;
  coordenador_nome: string | null;
  total: number;
  simpatizantes: number;
  fechados: number;
  lideres: number;
}

interface StatsBairro {
  bairro: string | null;
  total: number;
}

interface DashboardVereador {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  total_coordenadores: number;
  total_lideres: number;
  por_coordenador: StatsCoordenador[];
  por_bairro: StatsBairro[];
}

export default function DashboardVereadorPage() {
  const [data, setData] = useState<DashboardVereador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<DashboardVereador>("/api/dashboard/vereador")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500">Toda a base eleitoral</p>
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
            {/* Top stats */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 mb-4 text-white">
              <p className="text-sm opacity-80 mb-1">Total Geral da Base</p>
              <p className="text-5xl font-bold">{data.total_contatos}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="opacity-80">🟡 {data.total_simpatizantes} simpatizantes</span>
                <span className="opacity-80">🟢 {data.total_fechados} fechados</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-indigo-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-indigo-600">{data.total_coordenadores}</p>
                <p className="text-xs text-gray-600 mt-1">Coordenadores</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4">
                <p className="text-3xl font-bold text-purple-600">{data.total_lideres}</p>
                <p className="text-xs text-gray-600 mt-1">Líderes</p>
              </div>
            </div>

            {/* Por coordenador */}
            {data.por_coordenador.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Por Coordenador</h2>
                <div className="space-y-2">
                  {data.por_coordenador.map((coord, i) => (
                    <div key={coord.coordenador_id ?? i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 text-sm">
                          {coord.coordenador_nome || "Sem coordenador"}
                        </p>
                        <span className="text-lg font-bold text-blue-600">{coord.total}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>👥 {coord.lideres} líderes</span>
                        <span>🟡 {coord.simpatizantes}</span>
                        <span>🟢 {coord.fechados}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Por bairro */}
            {data.por_bairro.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📍 Por Bairro</h2>
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {data.por_bairro.map((b, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-700">{b.bairro || "Não informado"}</span>
                      <span className="font-semibold text-gray-900">{b.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.total_contatos === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm">Nenhum dado disponível ainda</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
