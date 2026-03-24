import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Configuracao {
  id: number;
  nome_candidato: string;
  foto_principal: string | null;
  slogan: string | null;
  numero: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  logo: string | null;
  frase_institucional: string | null;
}

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [form, setForm] = useState<Partial<Configuracao>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { usuario } = useAuth();

  const canEdit = ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "");

  useEffect(() => {
    apiGet<Configuracao>("/api/configuracao")
      .then(c => { setConfig(c); setForm(c); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const updated = await apiPatch<Configuracao>("/api/configuracao", form);
      setConfig(updated);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Identidade visual da campanha</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && config && (
          <>
            {/* Preview */}
            <div className="rounded-2xl p-5 mb-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${form.cor_primaria || "#1d4ed8"}, ${form.cor_secundaria || "#1e40af"})` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">🏛️</div>
                <div>
                  <p className="text-xl font-black">{form.nome_candidato || "Candidato"}</p>
                  {form.numero && <p className="text-sm font-bold text-white/80">Número {form.numero}</p>}
                </div>
              </div>
              {form.slogan && <p className="text-sm italic text-white/90 mt-2">"{form.slogan}"</p>}
              {form.frase_institucional && <p className="text-xs text-white/70 mt-1">{form.frase_institucional}</p>}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-medium">
                ✅ Configurações salvas com sucesso!
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">NOME DO CANDIDATO</label>
                <input
                  value={form.nome_candidato || ""}
                  onChange={e => setForm(f => ({ ...f, nome_candidato: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">NÚMERO</label>
                <input
                  value={form.numero || ""}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="Ex: 11"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">SLOGAN</label>
                <input
                  value={form.slogan || ""}
                  onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="Ex: Juntos por uma cidade melhor!"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">FRASE INSTITUCIONAL</label>
                <textarea
                  value={form.frase_institucional || ""}
                  onChange={e => setForm(f => ({ ...f, frase_institucional: e.target.value }))}
                  disabled={!canEdit}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">CORES DA CAMPANHA</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Cor Primária</p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                      <input
                        type="color"
                        value={form.cor_primaria || "#1d4ed8"}
                        onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
                        disabled={!canEdit}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-gray-600 font-mono">{form.cor_primaria}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Cor Secundária</p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                      <input
                        type="color"
                        value={form.cor_secundaria || "#1e40af"}
                        onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))}
                        disabled={!canEdit}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-gray-600 font-mono">{form.cor_secundaria}</span>
                    </div>
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </button>
              )}
            </div>

            {!canEdit && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Apenas administradores podem editar as configurações.
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
