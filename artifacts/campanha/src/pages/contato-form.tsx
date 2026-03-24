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
  regiao_id: number | null;
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

export default function ContatoFormPage({ modo }: { modo: "novo" | "editar" }) {
  const { usuario } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    nome: "", telefone: "", bairro: "", rua_referencia: "",
    nivel: "contato", observacao: "",
  });
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [regiaoId, setRegiaoId] = useState<string>("");

  const [loadingData, setLoadingData] = useState(modo === "editar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiGet<Regiao[]>("/api/regioes").then(setRegioes).catch(() => {});
  }, []);

  useEffect(() => {
    if (modo === "editar" && params.id) {
      apiGet<Contato>(`/api/contatos/${params.id}`)
        .then(data => {
          setForm({
            nome: data.nome,
            telefone: data.telefone,
            bairro: data.bairro || "",
            rua_referencia: data.rua_referencia || "",
            nivel: data.nivel,
            observacao: data.observacao || "",
          });
          if (data.regiao_id) setRegiaoId(String(data.regiao_id));
        })
        .catch(err => setError(err.message))
        .finally(() => setLoadingData(false));
    }
  }, [modo, params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const body = {
        nome: form.nome,
        telefone: form.telefone,
        bairro: form.bairro || null,
        rua_referencia: form.rua_referencia || null,
        nivel: form.nivel,
        observacao: form.observacao || null,
        regiao_id: regiaoId ? Number(regiaoId) : null,
      };
      if (modo === "novo") {
        await apiPost("/api/contatos", body);
      } else {
        await apiPatch(`/api/contatos/${params.id}`, body);
      }
      setSuccess(true);
      setTimeout(() => navigate("/contatos"), 1500);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/contatos")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {modo === "novo" ? "Cadastrar Pessoa" : "Editar Contato"}
            </h1>
            {usuario?.tipo === "lider" && (
              <p className="text-xs text-gray-500">Líder: {usuario.nome}</p>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium text-center">
            ✅ Contato salvo com sucesso!
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
            <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone <span className="text-red-500">*</span></label>
            <input name="telefone" type="tel" value={form.telefone} onChange={handleChange} required placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Nível visual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
            <div className="grid grid-cols-3 gap-2">
              {NIVEL_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, nivel: opt.value }))}
                  className={`rounded-xl p-3 text-center border-2 transition-all ${form.nivel === opt.value
                    ? opt.value === "fechado" ? "border-green-500 bg-green-50" : opt.value === "simpatizante" ? "border-yellow-500 bg-yellow-50" : "border-gray-400 bg-gray-50"
                    : "border-gray-200 bg-white"}`}>
                  <p className="text-xl mb-1">{opt.emoji}</p>
                  <p className="text-xs font-bold text-gray-700">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua / Referência</label>
            <input name="rua_referencia" value={form.rua_referencia} onChange={handleChange} placeholder="Rua, número ou ponto de referência"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {regioes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
              <select value={regiaoId} onChange={e => setRegiaoId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Selecionar região</option>
                {regioes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea name="observacao" value={form.observacao} onChange={handleChange} rows={3}
              placeholder="Anotações sobre o contato..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl disabled:opacity-50 text-sm">
            {loading ? "Salvando..." : modo === "novo" ? "Cadastrar Contato" : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
