import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

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
  por_coordenador: StatsCoordenador[];
  por_regiao: StatsRegiao[];
  ranking_lideres: StatsLider[];
  proximos_eventos: Evento[];
}

export default function DashboardCoordenadorGeralPage() {
  const [data, setData] = useState<DashboardCoordenadorGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    apiGet<DashboardCoordenadorGeral>("/api/dashboard/coordenador-geral")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const pieData = data ? [
    { name: "Contatos", value: Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados), color: "#6B7280" },
    { name: "Simpatizantes", value: data.total_simpatizantes, color: "#F59E0B" },
    { name: "Fechados", value: data.total_fechados, color: "#10B981" },
  ].filter(d => d.value > 0) : [];

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Operações</h1>
          <p className="text-sm text-gray-500">Visão operacional da campanha</p>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 mb-4 text-white shadow-lg">
              <p className="text-sm text-teal-200 mb-1">Total da Base</p>
              <p className="text-6xl font-black">{data.total_contatos}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span>{data.total_simpatizantes} simpatizantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                  <span>{data.total_fechados} fechados</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-3xl font-bold text-teal-600">{data.total_coordenadores}</p>
                <p className="text-xs text-gray-500 mt-1">Coordenadores</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-3xl font-bold text-purple-600">{data.total_lideres}</p>
                <p className="text-xs text-gray-500 mt-1">Líderes</p>
              </div>
            </div>

            {/* 1. Por Região */}
            {data.por_regiao.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Por Região</h2>
                  <button onClick={() => navigate("/regioes")} className="text-xs text-teal-600">Ver →</button>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.por_regiao.map(r => ({ name: r.regiao_nome || "Sem reg.", total: r.total, fechados: r.fechados }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fechados" name="Fechados" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 2. Distribuição da Base */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição da Base</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ranking Coordenadores */}
            {data.por_coordenador.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Ranking Coordenadores</h2>
                <div className="space-y-2">
                  {data.por_coordenador.map((c, i) => (
                    <div key={c.coordenador_id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 text-gray-600"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.coordenador_nome || "—"}</p>
                        {c.regiao_nome && <p className="text-xs text-gray-400">📍 {c.regiao_nome}</p>}
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                          <span>👥 {c.lideres}</span>
                          <span>🟡 {c.simpatizantes}</span>
                          <span>🟢 {c.fechados}</span>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-teal-600">{c.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Líderes */}
            {data.ranking_lideres.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top Líderes</h2>
                <div className="space-y-2">
                  {data.ranking_lideres.slice(0, 5).map((l, i) => (
                    <div key={l.lider_id ?? i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : "bg-gray-100 text-gray-600"}`}>{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{l.lider_nome || "—"}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>🟡 {l.simpatizantes}</span>
                          <span>🟢 {l.fechados}</span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-teal-600">{l.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximos Eventos */}
            {data.proximos_eventos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">📅 Próximos Eventos</h2>
                  <button onClick={() => navigate("/agenda")} className="text-xs text-teal-600">Ver →</button>
                </div>
                <div className="space-y-2">
                  {data.proximos_eventos.map((e) => (
                    <div key={e.id} className="flex gap-3 items-start p-3 bg-teal-50 rounded-xl">
                      <div className="bg-teal-100 rounded-lg p-1.5 text-center min-w-[40px]">
                        <p className="text-xs text-teal-700 font-bold">{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                        <p className="text-xs text-gray-500">{e.hora && e.hora.slice(0,5)} {e.local && `• ${e.local}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
