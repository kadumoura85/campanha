import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import Layout from "@/components/Layout";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  rua_referencia: string | null;
  nivel: string;
  observacao: string | null;
  origem: string | null;
  lider_id: number | null;
  coordenador_id: number | null;
  regiao_id: number | null;
}

interface UsuarioOption {
  id: number;
  nome: string;
  tipo: string;
  coordenador_id: number | null;
  regiao_id?: number | null;
  ativo?: boolean;
}

interface Regiao {
  id: number;
  nome: string;
}

const NIVEL_OPTIONS = [
  { value: "contato", label: "Contato", desc: "Ainda não declarou apoio", emoji: "👤" },
  { value: "simpatizante", label: "Simpatizante", desc: "Simpatiza com a campanha", emoji: "🟡" },
  { value: "fechado", label: "Fechado", desc: "Voto garantido", emoji: "✅" },
];

const ORIGEM_OPTIONS = [
  { value: "", label: "Não informada" },
  { value: "indica_lider", label: "Indicação de líder" },
  { value: "indica_coordenador", label: "Indicação de coordenador" },
  { value: "evento", label: "Evento da campanha" },
  { value: "caminhada", label: "Caminhada / ação de rua" },
  { value: "redes_sociais", label: "Redes sociais" },
  { value: "boca_a_boca", label: "Boca a boca" },
  { value: "contato_direto", label: "Contato direto" },
  { value: "outro", label: "Outro" },
];

export default function ContatoFormPage({ modo }: { modo: "novo" | "editar" }) {
  const { usuario } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const podeAcessar = ["lider", "coordenador_regional", "coordenador_geral", "super_admin"].includes(usuario?.tipo || "");
  const precisaEscolherLider = usuario?.tipo !== "lider";

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    bairro: "",
    rua_referencia: "",
    nivel: "contato",
    observacao: "",
    origem: "",
    lider_id: "",
  });
  const [lideres, setLideres] = useState<UsuarioOption[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loadingData, setLoadingData] = useState(modo === "editar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiGet<UsuarioOption[]>("/api/usuarios?tipo=lider")
      .then((data) => setLideres(data.filter((item) => item.tipo === "lider" && item.ativo !== false)))
      .catch(() => {});

    apiGet<Regiao[]>("/api/regioes")
      .then(setRegioes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (modo !== "editar" || !params.id) return;

    apiGet<Contato>(`/api/contatos/${params.id}`)
      .then((data) => {
        setForm({
          nome: data.nome,
          telefone: data.telefone,
          bairro: data.bairro || "",
          rua_referencia: data.rua_referencia || "",
          nivel: data.nivel,
          observacao: data.observacao || "",
          origem: data.origem || "",
          lider_id: data.lider_id ? String(data.lider_id) : "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [modo, params.id]);

  const liderSelecionado = useMemo(() => lideres.find((lider) => String(lider.id) === form.lider_id) || null, [form.lider_id, lideres]);
  const regiaoSelecionada = useMemo(() => regioes.find((regiao) => regiao.id === liderSelecionado?.regiao_id) || null, [liderSelecionado?.regiao_id, regioes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (precisaEscolherLider && !form.lider_id) {
      setError("Selecione um líder para o contato.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        nome: form.nome,
        telefone: form.telefone,
        bairro: form.bairro || null,
        rua_referencia: form.rua_referencia || null,
        nivel: form.nivel,
        observacao: form.observacao || null,
        origem: form.origem || null,
        lider_id: form.lider_id ? Number(form.lider_id) : null,
      };

      if (modo === "novo") {
        await apiPost("/api/contatos", body);
      } else {
        await apiPatch(`/api/contatos/${params.id}`, body);
      }

      setSuccess(true);
      setTimeout(() => navigate("/contatos"), 1200);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (!podeAcessar) {
    navigate("/contatos");
    return null;
  }

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/contatos")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{modo === "novo" ? "Cadastrar pessoa" : "Editar pessoa"}</h1>
            <p className="text-xs text-gray-500">
              {usuario?.tipo === "lider" ? `Vinculada automaticamente ao líder ${usuario.nome}` : "Toda pessoa precisa estar vinculada a um líder."}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium text-center">
            Pessoa salva com sucesso.
          </div>
        )}

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              placeholder="Nome completo"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone <span className="text-red-500">*</span>
            </label>
            <input
              name="telefone"
              type="tel"
              value={form.telefone}
              onChange={handleChange}
              required
              placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {precisaEscolherLider ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Líder responsável <span className="text-red-500">*</span>
              </label>
              <select
                name="lider_id"
                value={form.lider_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione um líder</option>
                {lideres.map((lider) => (
                  <option key={lider.id} value={lider.id}>
                    {lider.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              Líder responsável: <span className="font-semibold">{usuario?.nome}</span>
            </div>
          )}

          {(liderSelecionado || usuario?.tipo === "lider") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Coordenador</p>
                <p className="text-sm font-semibold text-gray-800">{liderSelecionado ? "Definido automaticamente" : "Do seu time"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Bairro</p>
                <p className="text-sm font-semibold text-gray-800">{regiaoSelecionada?.nome || "Definido pelo líder"}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nível de acompanhamento</label>
            <div className="grid grid-cols-3 gap-2">
              {NIVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, nivel: opt.value }))}
                  className={`rounded-xl p-3 text-center border-2 transition-all ${
                    form.nivel === opt.value
                      ? opt.value === "fechado"
                        ? "border-green-500 bg-green-50"
                        : opt.value === "simpatizante"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-gray-400 bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="text-xl mb-1">{opt.emoji}</p>
                  <p className="text-xs font-bold text-gray-700">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                name="bairro"
                value={form.bairro}
                onChange={handleChange}
                placeholder="Bairro"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rua / referência</label>
              <input
                name="rua_referencia"
                value={form.rua_referencia}
                onChange={handleChange}
                placeholder="Rua ou referência"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Como chegou até nós</label>
            <select
              name="origem"
              value={form.origem}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ORIGEM_OPTIONS.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              name="observacao"
              value={form.observacao}
              onChange={handleChange}
              rows={3}
              placeholder="Anotações sobre o contato..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl disabled:opacity-50 text-sm active:scale-95 transition-transform"
          >
            {loading ? "Salvando..." : modo === "novo" ? "Cadastrar pessoa" : "Salvar alterações"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
