import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import NivelBadge from "@/components/NivelBadge";
import { apiDelete, apiGet } from "@/lib/api";
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

interface Regiao {
  id: number;
  nome: string;
}

interface Lider {
  id: number;
  nome: string;
}

interface Coordenador {
  id: number;
  nome: string;
}

interface ResumoBase {
  contatos: number;
  simpatizantes: number;
  fechados: number;
}

const NIVEIS = [
  { value: "", label: "Todos" },
  { value: "contato", label: "Contato" },
  { value: "simpatizante", label: "Simpatizante" },
  { value: "fechado", label: "Fechado" },
];

function sortByNome<T extends { nome: string }>(items: T[]) {
  return [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

function getUrlFilters() {
  if (typeof window === "undefined") {
    return {
      nivel: "",
      regiao: "",
      lider: "",
      coordenador: "",
      busca: "",
      responsavel: "lider" as const,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    nivel: params.get("nivel") || "",
    regiao: params.get("regiao_id") || "",
    lider: params.get("lider_id") || "",
    coordenador: params.get("coordenador_id") || "",
    busca: params.get("busca") || "",
    responsavel: params.get("coordenador_id") ? ("coordenador" as const) : ("lider" as const),
  };
}

function buildResumoBase(items: Contato[]): ResumoBase {
  return {
    contatos: items.filter((item) => item.nivel === "contato").length,
    simpatizantes: items.filter((item) => item.nivel === "simpatizante").length,
    fechados: items.filter((item) => item.nivel === "fechado").length,
  };
}

export default function ContatosPage() {
  const { usuario } = useAuth();
  const [location, navigate] = useLocation();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [resumoBase, setResumoBase] = useState<ResumoBase>({
    contatos: 0,
    simpatizantes: 0,
    fechados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filtroNivel, setFiltroNivel] = useState(() => getUrlFilters().nivel);
  const [filtroRegiao, setFiltroRegiao] = useState(() => getUrlFilters().regiao);
  const [filtroLider, setFiltroLider] = useState(() => getUrlFilters().lider);
  const [filtroCoordenador, setFiltroCoordenador] = useState(() => getUrlFilters().coordenador);
  const [filtroResponsavel, setFiltroResponsavel] = useState<"lider" | "coordenador">(() => getUrlFilters().responsavel);
  const [busca, setBusca] = useState(() => getUrlFilters().busca);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);

  const filtrosAtivos = [filtroNivel, filtroRegiao, filtroLider, filtroCoordenador, busca].filter(Boolean).length;

  const podeCadastrar = ["lider", "coordenador_regional", "coordenador_geral", "super_admin"].includes(usuario?.tipo || "");
  const podeEditar = ["lider", "coordenador_regional", "coordenador_geral", "vereador", "super_admin"].includes(usuario?.tipo || "");
  const podeExcluir = ["lider", "coordenador_regional", "coordenador_geral", "vereador", "super_admin"].includes(usuario?.tipo || "");
  const showLiderFilter = ["vereador", "super_admin", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const showRegiaoFilter = ["vereador", "super_admin", "coordenador_geral"].includes(usuario?.tipo || "");
  const showCoordenadorFilter = ["vereador", "super_admin", "coordenador_geral"].includes(usuario?.tipo || "");
  const showResponsavelToggle = showCoordenadorFilter && showLiderFilter;

  useEffect(() => {
    const filters = getUrlFilters();
    setFiltroNivel(filters.nivel);
    setFiltroRegiao(filters.regiao);
    setFiltroLider(filters.lider);
    setFiltroCoordenador(filters.coordenador);
    setBusca(filters.busca);
    setFiltroResponsavel(filters.responsavel);
  }, [location]);

  useEffect(() => {
    if (showRegiaoFilter) {
      apiGet<Regiao[]>("/api/regioes").then((items) => setRegioes(sortByNome(items))).catch(() => {});
    }

    if (showLiderFilter) {
      apiGet<{ id: number; nome: string; tipo: string }[]>("/api/usuarios")
        .then((users) => {
          setLideres(sortByNome(users.filter((u) => u.tipo === "lider")));
          setCoordenadores(sortByNome(users.filter((u) => u.tipo === "coordenador_regional")));
        })
        .catch(() => {});
    }
  }, [showLiderFilter, showRegiaoFilter]);

  const loadResumo = () => {
    const params = new URLSearchParams();
    if (filtroRegiao) params.set("regiao_id", filtroRegiao);

    if (showResponsavelToggle) {
      if (filtroResponsavel === "lider" && filtroLider) params.set("lider_id", filtroLider);
      if (filtroResponsavel === "coordenador" && filtroCoordenador) params.set("coordenador_id", filtroCoordenador);
    } else if (filtroLider) {
      params.set("lider_id", filtroLider);
    }

    apiGet<Contato[]>(`/api/contatos${params.toString() ? `?${params.toString()}` : ""}`)
      .then((items) => setResumoBase(buildResumoBase(items)))
      .catch(() => {});
  };

  const loadContatos = () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filtroNivel) params.set("nivel", filtroNivel);
    if (filtroRegiao) params.set("regiao_id", filtroRegiao);

    if (showResponsavelToggle) {
      if (filtroResponsavel === "lider" && filtroLider) params.set("lider_id", filtroLider);
      if (filtroResponsavel === "coordenador" && filtroCoordenador) params.set("coordenador_id", filtroCoordenador);
    } else if (filtroLider) {
      params.set("lider_id", filtroLider);
    }

    if (busca) params.set("busca", busca);

    apiGet<Contato[]>(`/api/contatos${params.toString() ? `?${params.toString()}` : ""}`)
      .then((items) => setContatos(sortByNome(items)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadResumo();
  }, [filtroRegiao, filtroLider, filtroCoordenador, filtroResponsavel]);

  useEffect(() => {
    loadContatos();
  }, [filtroNivel, filtroRegiao, filtroLider, filtroCoordenador, filtroResponsavel]);

  useEffect(() => {
    setFiltroLider("");
    setFiltroCoordenador("");
  }, [filtroResponsavel]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadContatos();
  };

  const limparFiltros = () => {
    setFiltroNivel("");
    setFiltroRegiao("");
    setFiltroLider("");
    setFiltroCoordenador("");
    setBusca("");
    setFiltroResponsavel("lider");
  };

  const deleteContato = async (contato: Contato) => {
    if (!window.confirm(`Tem certeza que deseja excluir o contato ${contato.nome}?`)) return;

    try {
      await apiDelete(`/api/contatos/${contato.id}`);
      loadResumo();
      loadContatos();
    } catch (e: any) {
      window.alert(e.message || "Não foi possível excluir este contato.");
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pessoas</h1>
            <p className="text-sm text-gray-500">{contatos.length} encontrados</p>
          </div>
          {podeCadastrar && (
            <button
              onClick={() => navigate("/contatos/novo")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl text-sm"
            >
              + Novo
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-1">Como a base está organizada</p>
          <p className="text-xs text-gray-500 mb-3">
            Toda pessoa fica com um líder. Esse líder pertence a um coordenador, e o coordenador pertence a um bairro.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ResumoCard label="Contatos" value={resumoBase.contatos} color="text-gray-800" />
            <ResumoCard label="Simpatizantes" value={resumoBase.simpatizantes} color="text-yellow-600" />
            <ResumoCard label="Fechados" value={resumoBase.fechados} color="text-green-600" />
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl text-sm font-medium">
              Buscar
            </button>
          </div>
        </form>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {NIVEIS.map((nivel) => (
            <button
              key={nivel.value}
              onClick={() => setFiltroNivel(nivel.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filtroNivel === nivel.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {nivel.label}
            </button>
          ))}
        </div>

        {(showRegiaoFilter || showLiderFilter || showCoordenadorFilter) && (
          <div className="space-y-2 mb-4 bg-gray-50 border border-gray-100 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Filtros {filtrosAtivos > 0 ? `(${filtrosAtivos})` : ""}
              </p>
              {filtrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {showResponsavelToggle && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFiltroResponsavel("lider")}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filtroResponsavel === "lider" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Líderes
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroResponsavel("coordenador")}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filtroResponsavel === "coordenador" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Coordenadores
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {showRegiaoFilter && regioes.length > 0 && (
                <select
                  value={filtroRegiao}
                  onChange={(e) => setFiltroRegiao(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos os bairros</option>
                  {regioes.map((regiao) => (
                    <option key={regiao.id} value={String(regiao.id)}>
                      {regiao.nome}
                    </option>
                  ))}
                </select>
              )}

              {showLiderFilter && (!showResponsavelToggle || filtroResponsavel === "lider") && lideres.length > 0 && (
                <select
                  value={filtroLider}
                  onChange={(e) => setFiltroLider(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos os líderes</option>
                  {lideres.map((lider) => (
                    <option key={lider.id} value={String(lider.id)}>
                      {lider.nome}
                    </option>
                  ))}
                </select>
              )}

              {showCoordenadorFilter && (!showResponsavelToggle || filtroResponsavel === "coordenador") && coordenadores.length > 0 && (
                <select
                  value={filtroCoordenador}
                  onChange={(e) => setFiltroCoordenador(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos os coordenadores</option>
                  {coordenadores.map((coordenador) => (
                    <option key={coordenador.id} value={String(coordenador.id)}>
                      {coordenador.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
            <p className="text-sm">Nenhuma pessoa encontrada</p>
          </div>
        )}

        <div className="space-y-2">
          {contatos.map((contato) => (
            <div key={contato.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                {contato.nome.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900 truncate text-sm">{contato.nome}</p>
                  <NivelBadge nivel={contato.nivel} />
                </div>

                <p className="text-xs text-gray-500">{contato.telefone}</p>

                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {contato.bairro && <p className="text-xs text-gray-400">📍 {contato.bairro}</p>}
                  {contato.regiao_nome && <p className="text-xs text-gray-400">🗺️ {contato.regiao_nome}</p>}
                </div>

                {["coordenador_regional", "coordenador_geral", "vereador", "super_admin"].includes(usuario?.tipo || "") &&
                  contato.lider_nome && <p className="text-xs text-blue-500 mt-0.5">Líder: {contato.lider_nome}</p>}

                {["coordenador_geral", "vereador", "super_admin"].includes(usuario?.tipo || "") && contato.coordenador_nome && (
                  <p className="text-xs text-indigo-500 mt-0.5">Coordenador: {contato.coordenador_nome}</p>
                )}
              </div>

              {(podeEditar || podeExcluir) && (
                <div className="flex flex-col gap-1">
                  {podeEditar && (
                    <button
                      onClick={() => navigate(`/contatos/${contato.id}/editar`)}
                      className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50"
                    >
                      Editar
                    </button>
                  )}

                  {podeExcluir && (
                    <button
                      onClick={() => deleteContato(contato)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function ResumoCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
