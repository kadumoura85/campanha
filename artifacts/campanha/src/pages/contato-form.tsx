import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
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
}

export default function ContatoFormPage({ modo }: { modo: "novo" | "editar" }) {
  const { usuario } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    bairro: "",
    rua_referencia: "",
    nivel: "contato",
    observacao: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(modo === "editar");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (modo === "editar" && params.id) {
      apiGet<Contato>(`/api/contatos/${params.id}`)
        .then((data) => {
          setForm({
            nome: data.nome,
            telefone: data.telefone,
            bairro: data.bairro || "",
            rua_referencia: data.rua_referencia || "",
            nivel: data.nivel,
            observacao: data.observacao || "",
          });
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoadingData(false));
    }
  }, [modo, params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string | null> = {
        nome: form.nome,
        telefone: form.telefone,
        bairro: form.bairro || null,
        rua_referencia: form.rua_referencia || null,
        nivel: form.nivel,
        observacao: form.observacao || null,
      };

      if (modo === "novo") {
        await apiPost("/api/contatos", body);
        setSuccess(true);
        setTimeout(() => navigate("/contatos"), 1500);
      } else {
        await apiPatch(`/api/contatos/${params.id}`, body);
        setSuccess(true);
        setTimeout(() => navigate("/contatos"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao salvar contato");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/contatos")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {modo === "novo" ? "Cadastrar Pessoa" : "Editar Contato"}
            </h1>
            <p className="text-xs text-gray-500">
              {usuario?.tipo === "lider" ? `Líder: ${usuario.nome}` : ""}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium text-center">
            ✅ Contato salvo com sucesso!
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              type="text"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
            <select
              name="nivel"
              value={form.nivel}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="contato">Contato</option>
              <option value="simpatizante">Simpatizante</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input
              name="bairro"
              type="text"
              value={form.bairro}
              onChange={handleChange}
              placeholder="Bairro do contato"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua / Referência</label>
            <input
              name="rua_referencia"
              type="text"
              value={form.rua_referencia}
              onChange={handleChange}
              placeholder="Rua, número ou ponto de referência"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Salvando..." : modo === "novo" ? "Cadastrar Contato" : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
