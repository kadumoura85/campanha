import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import NivelBadge from "@/components/NivelBadge";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  nivel: string;
  lider_id: number | null;
  coordenador_id: number | null;
  regiao_id: number | null;
  lider_nome: string | null;
  coordenador_nome: string | null;
  regiao_nome: string | null;
}

interface Regiao { id: number; nome: string; }
interface Lider { id: number; nome: string; }

const NIVEIS = [
  { value: "", label: "Todos" },
  { value: "contato", label: "Contato" },
  { value: "simpatizante", label: "Simpatizante" },
  { value: "fechado", label: "Fechado" },
];

export default function ContatosPage() {
  const { usuario } = useAuth();
  const [, navigate] = useLocation();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroRegiao, setFiltroRegiao] = useState("");
  const [filtroLider, setFiltroLider] = useState("");
  const [busca, setBusca] = useState("");
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);

  const podeCadastrar = ["lider", "super_admin"].includes(usuario?.tipo || "");
  const podeEditar = ["lider", "super_admin"].includes(usuario?.tipo || "");
  const showLiderFilter = ["vereador", "super_admin", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const showRegiaoFilter = ["vereador", "super_admin", "coordenador_geral"].includes(usuario?.tipo || "");

  useEffect(() => {
    if (showRegiaoFilter) {
      apiGet<Regiao[]>("/api/regioes").then(setRegioes).catch(() => {});
    }
    if (showLiderFilter) {
      apiGet<{ id: number; nome: string; tipo: string }[]>("/api/usuarios")
        .then(users => setLideres(users.filter(u => u.tipo === "lider")))
        .catch(() => {});
    }
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroNivel) params.set("nivel", filtroNivel);
    if (filtroRegiao) params.set("regiao_id", filtroRegiao);
    if (filtroLider) params.set("lider_id", filtroLider);
    if (busca) params.set("busca", busca);
    apiGet<Contato[]>(`/api/contatos${params.toString() ? "?" + params.toString() : ""}`)
      .then(setContatos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtroNivel, filtroRegiao, filtroLider]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contatos</h1>
            <p className="text-sm text-gray-500">{contatos.length} encontrados</p>
          </div>
          {podeCadastrar && (
            <button onClick={() => navigate("/contatos/novo")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl text-sm">
              + Novo
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl text-sm font-medium">
              Buscar
            </button>
          </div>
        </form>

        {/* Filtro Nível */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {NIVEIS.map(n => (
            <button key={n.value} onClick={() => setFiltroNivel(n.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filtroNivel === n.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Filtros adicionais */}
        {(showRegiaoFilter || showLiderFilter) && (
          <div className="flex gap-2 mb-4">
            {showRegiaoFilter && regioes.length > 0 && (
              <select
                value={filtroRegiao}
                onChange={e => setFiltroRegiao(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todas as regiões</option>
                {regioes.map(r => (
                  <option key={r.id} value={String(r.id)}>{r.nome}</option>
                ))}
              </select>
            )}
            {showLiderFilter && lideres.length > 0 && (
              <select
                value={filtroLider}
                onChange={e => setFiltroLider(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todos os líderes</option>
                {lideres.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.nome}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && contatos.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        )}

        <div className="space-y-2">
          {contatos.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900 truncate text-sm">{c.nome}</p>
                  <NivelBadge nivel={c.nivel} />
                </div>
                <p className="text-xs text-gray-500">{c.telefone}</p>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {c.bairro && <p className="text-xs text-gray-400">📍 {c.bairro}</p>}
                  {c.regiao_nome && <p className="text-xs text-gray-400">🗺️ {c.regiao_nome}</p>}
                </div>
                {["coordenador_regional", "coordenador_geral", "vereador", "super_admin"].includes(usuario?.tipo || "") && c.lider_nome && (
                  <p className="text-xs text-blue-400 mt-0.5">👤 {c.lider_nome}</p>
                )}
              </div>
              {podeEditar && (
                <button onClick={() => navigate(`/contatos/${c.id}/editar`)}
                  className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50">
                  Editar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
