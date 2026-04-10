import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet, apiPost } from "@/lib/api";
import { cidadesComBairros } from "@/data/bairros-por-cidade";

interface RegiaoExistente {
  id: number;
  nome: string;
}

export default function RegiaoNovaPage() {
  const [, navigate] = useLocation();
  const [cidadeId, setCidadeId] = useState(cidadesComBairros[0]?.id || "");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregandoExistentes, setCarregandoExistentes] = useState(false);
  const [existentes, setExistentes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const cidade = useMemo(
    () => cidadesComBairros.find((item) => item.id === cidadeId) || cidadesComBairros[0],
    [cidadeId],
  );

  const bairrosFiltrados = useMemo(() => {
    if (!cidade) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return cidade.bairros;
    return cidade.bairros.filter((bairro) => bairro.toLowerCase().includes(termo));
  }, [busca, cidade]);

  const existentesSet = useMemo(() => new Set(existentes.map((item) => item.toLowerCase())), [existentes]);

  const loadExistentes = async () => {
    setCarregandoExistentes(true);
    try {
      const data = await apiGet<RegiaoExistente[]>("/api/regioes");
      setExistentes(data.map((item) => item.nome));
    } finally {
      setCarregandoExistentes(false);
    }
  };

  useEffect(() => {
    void loadExistentes();
  }, []);

  const toggleBairro = (bairro: string) => {
    if (existentesSet.has(bairro.toLowerCase())) return;

    setSelecionados((current) =>
      current.includes(bairro) ? current.filter((item) => item !== bairro) : [...current, bairro],
    );
  };

  const selecionarTodosVisiveis = () => {
    const disponiveis = bairrosFiltrados.filter((bairro) => !existentesSet.has(bairro.toLowerCase()));
    setSelecionados((current) => Array.from(new Set([...current, ...disponiveis])));
  };

  const limparSelecao = () => {
    setSelecionados([]);
  };

  const salvar = async () => {
    if (!cidade || selecionados.length === 0) {
      setErro("Selecione pelo menos um bairro para cadastrar.");
      return;
    }

    setErro("");
    setSalvando(true);

    try {
      for (const bairro of selecionados) {
        await apiPost("/api/regioes", {
          nome: bairro,
          descricao: `Bairro de ${cidade.nome}/${cidade.uf}`,
          prioridade: "normal",
          cor: "#3B82F6",
        });
      }

      navigate("/regioes");
    } catch (e: any) {
      setErro(e.message || "Não foi possível cadastrar os bairros selecionados.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => navigate("/regioes")} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
          ← Voltar para bairros
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Importar bairros</h1>
          <p className="text-sm text-gray-500 mt-1">
            Escolha a cidade, marque os bairros que quer usar no sistema e cadastre tudo de uma vez.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cidade</label>
            <select
              value={cidadeId}
              onChange={(e) => {
                setCidadeId(e.target.value);
                setSelecionados([]);
                setBusca("");
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cidadesComBairros.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} / {item.uf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Buscar bairro</label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite para filtrar os bairros..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={selecionarTodosVisiveis} className="text-xs px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-medium">
              Selecionar visíveis
            </button>
            <button onClick={limparSelecao} className="text-xs px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium">
              Limpar seleção
            </button>
            <div className="text-xs px-3 py-2 rounded-xl bg-green-50 text-green-700 font-medium">
              {selecionados.length} selecionado(s)
            </div>
            {carregandoExistentes && (
              <div className="text-xs px-3 py-2 rounded-xl bg-amber-50 text-amber-700 font-medium">Verificando existentes...</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Bairros de {cidade?.nome} / {cidade?.uf}
          </p>
          <div className="grid sm:grid-cols-2 gap-2 max-h-[28rem] overflow-auto">
            {bairrosFiltrados.map((bairro) => {
              const jaExiste = existentesSet.has(bairro.toLowerCase());
              const marcado = selecionados.includes(bairro);

              return (
                <button
                  key={bairro}
                  onClick={() => toggleBairro(bairro)}
                  disabled={jaExiste}
                  className={`text-left rounded-xl border px-3 py-3 text-sm transition-colors ${
                    jaExiste
                      ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                      : marcado
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-800 hover:border-blue-300"
                  }`}
                >
                  <span className="block font-medium">{bairro}</span>
                  <span className={`block text-xs mt-1 ${marcado ? "text-white/80" : jaExiste ? "text-gray-400" : "text-gray-500"}`}>
                    {jaExiste ? "Já cadastrado" : "Clique para selecionar"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/regioes")}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || selecionados.length === 0}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {salvando ? "Cadastrando..." : "Cadastrar bairros"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
