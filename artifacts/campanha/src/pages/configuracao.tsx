import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCampanha } from "@/contexts/CampanhaContext";

interface Configuracao {
  id: number;
  nome_candidato: string;
  foto_principal: string | null;
  slogan: string | null;
  numero: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  logo: string | null;
  santinho_imagem: string | null;
  capa_imagem: string | null;
  frase_institucional: string | null;
  musica_url: string | null;
  descricao_curta: string | null;
}

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [form, setForm] = useState<Partial<Configuracao>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { usuario } = useAuth();
  const { refresh: refreshCampanha } = useCampanha();

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
      await refreshCampanha();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMusic = () => {
    const url = form.musica_url;
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
    }
    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setMusicPlaying(true);
    }
  };

  const Field = ({ label, value, onChange, placeholder, disabled, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; disabled?: boolean; type?: string;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );

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
            <div className="rounded-2xl p-5 mb-5 text-white shadow-lg relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${form.cor_primaria || "#1d4ed8"}, ${form.cor_secundaria || "#1e40af"})` }}>
              <div className="flex items-center gap-3 mb-2">
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
                ) : form.foto_principal ? (
                  <img src={form.foto_principal} alt={form.nome_candidato || ""} className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
                ) : (
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">🏛️</div>
                )}
                <div>
                  <p className="text-xl font-black">{form.nome_candidato || "Candidato"}</p>
                  {form.numero && <p className="text-sm font-bold text-white/80">Número {form.numero}</p>}
                </div>
              </div>
              {form.slogan && <p className="text-sm italic text-white/90 mt-2">"{form.slogan}"</p>}
              {form.frase_institucional && <p className="text-xs text-white/70 mt-1">{form.frase_institucional}</p>}
              {form.musica_url && (
                <button onClick={toggleMusic}
                  className="mt-3 flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-medium transition-all">
                  <span>{musicPlaying ? "⏸️" : "🎵"}</span>
                  <span>{musicPlaying ? "Pausar" : "Tocar Música da Campanha"}</span>
                </button>
              )}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-medium">
                ✅ Configurações salvas com sucesso! As cores do sistema foram atualizadas.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>
            )}

            {/* Identidade */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identidade do Candidato</p>
              <Field label="NOME DO CANDIDATO" value={form.nome_candidato || ""} onChange={v => setForm(f => ({ ...f, nome_candidato: v }))} disabled={!canEdit} />
              <Field label="NÚMERO DA CAMPANHA" value={form.numero || ""} onChange={v => setForm(f => ({ ...f, numero: v }))} placeholder="Ex: 11" disabled={!canEdit} />
              <Field label="SLOGAN" value={form.slogan || ""} onChange={v => setForm(f => ({ ...f, slogan: v }))} placeholder="Ex: Juntos por uma cidade melhor!" disabled={!canEdit} />
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">DESCRIÇÃO CURTA</label>
                <textarea
                  value={form.descricao_curta || ""}
                  onChange={e => setForm(f => ({ ...f, descricao_curta: e.target.value }))}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="Breve descrição da campanha..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
                />
              </div>
            </div>

            {/* Imagens */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Imagens (URLs)</p>
              <Field label="FOTO DO CANDIDATO (URL)" value={form.foto_principal || ""} onChange={v => setForm(f => ({ ...f, foto_principal: v }))} placeholder="https://..." disabled={!canEdit} />
              {form.foto_principal && (
                <div className="flex items-center gap-2">
                  <img src={form.foto_principal} alt="Foto" className="w-12 h-12 rounded-full object-cover border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-xs text-gray-400">Preview da foto</span>
                </div>
              )}
              <Field label="LOGO (URL)" value={form.logo || ""} onChange={v => setForm(f => ({ ...f, logo: v }))} placeholder="https://..." disabled={!canEdit} />
              {form.logo && (
                <div className="flex items-center gap-2">
                  <img src={form.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-xs text-gray-400">Preview do logo</span>
                </div>
              )}
              <Field label="SANTINHO (URL)" value={form.santinho_imagem || ""} onChange={v => setForm(f => ({ ...f, santinho_imagem: v }))} placeholder="https://..." disabled={!canEdit} />
              <Field label="IMAGEM DE CAPA (URL)" value={form.capa_imagem || ""} onChange={v => setForm(f => ({ ...f, capa_imagem: v }))} placeholder="https://..." disabled={!canEdit} />
            </div>

            {/* Cores */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cores da Campanha</p>
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
              <p className="text-xs text-gray-400 mt-2">As cores são aplicadas automaticamente no header, navegação e botões do sistema.</p>
            </div>

            {/* Música */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Música da Campanha</p>
              <Field label="URL DA MÚSICA (MP3, SoundCloud, etc)" value={form.musica_url || ""} onChange={v => setForm(f => ({ ...f, musica_url: v }))} placeholder="https://..." disabled={!canEdit} />
              {form.musica_url && (
                <button
                  type="button"
                  onClick={toggleMusic}
                  className="mt-3 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-medium transition-all w-full justify-center"
                >
                  <span>{musicPlaying ? "⏸️" : "▶️"}</span>
                  <span>{musicPlaying ? "Pausar música" : "Testar música da campanha"}</span>
                </button>
              )}
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
