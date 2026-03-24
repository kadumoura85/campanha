import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import NivelBadge from "@/components/NivelBadge";
import { apiGet } from "@/lib/api";

interface DashboardLider {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  ultimos_cadastrados: Array<{
    id: number;
    nome: string;
    telefone: string;
    bairro: string | null;
    nivel: string;
    created_at: string;
  }>;
}

export default function DashboardLiderPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardLider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<DashboardLider>("/api/dashboard/lider")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Total de Contatos",
      value: data?.total_contatos ?? 0,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Simpatizantes",
      value: data?.total_simpatizantes ?? 0,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Fechados",
      value: data?.total_fechados ?? 0,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Minha Base</h1>
          <p className="text-sm text-gray-500">Visão geral dos seus contatos</p>
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
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {stats.map((stat) => (
                <div key={stat.label} className={`${stat.bgColor} rounded-2xl p-4 text-center`}>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate("/contatos/novo")}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-5 px-6 rounded-2xl transition-all shadow-lg text-lg mb-6 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">👤</span>
              Cadastrar Pessoa
            </button>

            {/* Recent contacts */}
            {data.ultimos_cadastrados.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimos Cadastrados</h2>
                <div className="space-y-2">
                  {data.ultimos_cadastrados.map((contato) => (
                    <div
                      key={contato.id}
                      onClick={() => navigate(`/contatos/${contato.id}/editar`)}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {contato.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{contato.nome}</p>
                        <p className="text-xs text-gray-500">{contato.telefone}</p>
                        {contato.bairro && <p className="text-xs text-gray-400">{contato.bairro}</p>}
                      </div>
                      <NivelBadge nivel={contato.nivel} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/contatos")}
                  className="w-full mt-3 text-sm text-blue-600 font-medium py-2 hover:underline"
                >
                  Ver todos →
                </button>
              </div>
            )}

            {data.ultimos_cadastrados.length === 0 && (
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
