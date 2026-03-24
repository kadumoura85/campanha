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
  rua_referencia: string | null;
  nivel: string;
  observacao: string | null;
  lider_id: number | null;
  coordenador_id: number | null;
  created_at: string;
  lider_nome: string | null;
  coordenador_nome: string | null;
}

export default function ContatosPage() {
  const { usuario } = useAuth();
  const [, navigate] = useLocation();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroBairro, setFiltroBairro] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [buscaNome, setBuscaNome] = useState("");

  const carregarContatos = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroBairro) params.set("bairro", filtroBairro);
    if (filtroNivel) params.set("nivel", filtroNivel);
    const url = `/api/contatos${params.toString() ? "?" + params.toString() : ""}`;
    apiGet<Contato[]>(url)
      .then(setContatos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarContatos();
  }, [filtroBairro, filtroNivel]);

  const bairrosUnicos = [...new Set(contatos.map((c) => c.bairro).filter(Boolean))];

  const contatosFiltrados = buscaNome
    ? contatos.filter((c) =>
        c.nome.toLowerCase().includes(buscaNome.toLowerCase()) ||
        c.telefone.includes(buscaNome)
      )
    : contatos;

  const podeEditar = usuario?.tipo === "lider" || usuario?.tipo === "coordenador";
  const podeCadastrar = usuario?.tipo === "lider" || usuario?.tipo === "coordenador";

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contatos</h1>
            <p className="text-sm text-gray-500">{contatosFiltrados.length} encontrados</p>
          </div>
          {podeCadastrar && (
            <button
              onClick={() => navigate("/contatos/novo")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors"
            >
              + Novo
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os níveis</option>
            <option value="contato">Contato</option>
            <option value="simpatizante">Simpatizante</option>
            <option value="fechado">Fechado</option>
          </select>

          <select
            value={filtroBairro}
            onChange={(e) => setFiltroBairro(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os bairros</option>
            {bairrosUnicos.map((b) => (
              <option key={b} value={b!}>{b}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && contatosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        )}

        <div className="space-y-2">
          {contatosFiltrados.map((contato) => (
            <div
              key={contato.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                {contato.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-gray-900 truncate text-sm">{contato.nome}</p>
                  <NivelBadge nivel={contato.nivel} />
                </div>
                <p className="text-xs text-gray-500">{contato.telefone}</p>
                {contato.bairro && <p className="text-xs text-gray-400">{contato.bairro}</p>}
                {(usuario?.tipo === "coordenador" || usuario?.tipo === "vereador") && contato.lider_nome && (
                  <p className="text-xs text-blue-400">👤 {contato.lider_nome}</p>
                )}
              </div>
              {podeEditar && (
                <button
                  onClick={() => navigate(`/contatos/${contato.id}/editar`)}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
                >
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
