import { useEffect, useRef, useState } from "react";
import CampanhaAvatar from "@/components/CampanhaAvatar";
import Layout from "@/components/Layout";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCampanha } from "@/contexts/CampanhaContext";
import { getCampaignDisplayName } from "@/lib/campanha";

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
  musica_youtube_url: string | null;
  descricao_curta: string | null;
}

type UploadKind = "foto_principal" | "santinho_imagem";
type MusicMode = "audio" | "youtube";

const uploadValidation: Record<
  UploadKind,
  { minWidth: number; minHeight: number; helper: string }
> = {
  foto_principal: {
    minWidth: 300,
    minHeight: 300,
    helper: "Use uma imagem nítida, de preferência quadrada.",
  },
  santinho_imagem: {
    minWidth: 600,
    minHeight: 800,
    helper: "Use um santinho legível, em pé, com boa resolução.",
  },
};

const uploadLabels: Record<UploadKind, { title: string; description: string }> = {
  foto_principal: {
    title: "Foto do candidato",
    description: "Usada no login, dashboards e identificação da campanha.",
  },
  santinho_imagem: {
    title: "Santinho",
    description: "Material que os líderes poderão baixar e compartilhar.",
  },
};

function isPlayableAudioUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) return false;
  if (url.startsWith("data:audio/") || url.startsWith("blob:")) return true;

  try {
    const parsed = new URL(url);
    return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isYoutubeUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return /(^|\.)youtube\.com$/i.test(parsed.hostname) || /(^|\.)youtu\.be$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeMusicFields(data: Configuracao): Configuracao {
  if (data.musica_youtube_url) return data;

  if (isYoutubeUrl(data.musica_url)) {
    return {
      ...data,
      musica_youtube_url: data.musica_url,
      musica_url: null,
    };
  }

  return data;
}

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{eyebrow}</p>
      <p className="text-base font-semibold text-gray-900 mt-2">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [form, setForm] = useState<Partial<Configuracao>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMode, setMusicMode] = useState<MusicMode>("audio");
  const [uploading, setUploading] = useState<Record<UploadKind, boolean>>({
    foto_principal: false,
    santinho_imagem: false,
  });
  const [uploadPreviews, setUploadPreviews] = useState<Record<UploadKind, string | null>>({
    foto_principal: null,
    santinho_imagem: null,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { usuario } = useAuth();
  const { refresh: refreshCampanha } = useCampanha();

  const canAccessPage = usuario?.tipo === "coordenador_geral";
  const canEdit = canAccessPage;
  const campaignName = getCampaignDisplayName(form.nome_candidato);

  if (!canAccessPage) {
    return (
      <Layout>
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <h1 className="text-xl font-bold text-gray-900">Configuração indisponível</h1>
            <p className="text-sm text-gray-500 mt-2">
              Esta área está disponível apenas para o coordenador geral.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    apiGet<Configuracao>("/api/configuracao")
      .then((data) => {
        const normalized = normalizeMusicFields(data);
        setConfig(normalized);
        setForm(normalized);
        setMusicMode(normalized.musica_youtube_url ? "youtube" : "audio");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      Object.values(uploadPreviews).forEach((value) => {
        if (value?.startsWith("blob:")) {
          URL.revokeObjectURL(value);
        }
      });
    };
  }, [uploadPreviews]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await apiPatch<Configuracao>("/api/configuracao", {
        ...form,
        musica_url: musicMode === "audio" ? form.musica_url ?? null : null,
        musica_youtube_url: musicMode === "youtube" ? form.musica_youtube_url ?? null : null,
      });
      const normalized = normalizeMusicFields(updated);
      setConfig(normalized);
      setForm(normalized);
      setMusicMode(normalized.musica_youtube_url ? "youtube" : "audio");
      setSaved(true);
      await refreshCampanha();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (kind: UploadKind, file: File | null) => {
    if (!file || !canEdit) return;

    const previewUrl = URL.createObjectURL(file);
    setUploadPreviews((current) => {
      const previous = current[kind];
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return {
        ...current,
        [kind]: previewUrl,
      };
    });
    setUploading((current) => ({ ...current, [kind]: true }));
    setError("");
    setSaved(false);

    try {
      await validateUploadFile(kind, file);
      const updated = await apiPost<Configuracao>("/api/configuracao/upload", {
        kind,
        fileName: file.name,
        dataUrl: await readFileAsDataUrl(file),
      });

      setConfig(updated);
      setForm(updated);
      setUploadPreviews((current) => {
        const previous = current[kind];
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }

        return {
          ...current,
          [kind]: null,
        };
      });
      setSaved(true);
      await refreshCampanha();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Não foi possível enviar a imagem.");
    } finally {
      setUploading((current) => ({ ...current, [kind]: false }));
    }
  };

  const toggleMusic = () => {
    const url = form.musica_url;
    if (!url) return;

    if (!isPlayableAudioUrl(url)) {
      setError("Use um link direto de áudio, como .mp3, .wav, .ogg ou .m4a. Links do YouTube não funcionam neste campo.");
      setMusicPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.onerror = () => {
        setMusicPlaying(false);
        setError("Não foi possível tocar esta música. Verifique se o link aponta direto para um arquivo de áudio válido.");
      };
    }

    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current.src = url;
      setError("");
      void audioRef.current.play()
        .then(() => setMusicPlaying(true))
        .catch(() => {
          setMusicPlaying(false);
          setError("Não foi possível tocar esta música. Use um link direto para arquivo de áudio.");
        });
    }
  };

  const openYoutubeMusic = () => {
    const url = form.musica_youtube_url?.trim();
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (!isYoutubeUrl(parsed.toString())) {
        setError("Use um link do YouTube válido para a opção de vídeo.");
        return;
      }
      setError("");
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch {
      setError("Use um link do YouTube válido para a opção de vídeo.");
    }
  };

  const resetThemeColors = () => {
    setForm((current) => ({
      ...current,
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
    }));
    setSaved(false);
    setError("");
  };

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Ajuste nome, imagens, cores e música da campanha.</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && config && (
          <>
            <div
              className="rounded-2xl p-5 mb-5 text-white shadow-lg relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${form.cor_primaria || "#1d4ed8"}, ${form.cor_secundaria || "#1e40af"})` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <CampanhaAvatar
                  nome={campaignName}
                  logo={form.logo}
                  foto={form.foto_principal}
                  alt={campaignName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                  fallbackClassName="bg-white/20 flex items-center justify-center"
                  textClassName="text-base font-black text-white"
                />
                <div>
                  <p className="text-xl font-black">{campaignName}</p>
                  {form.numero && <p className="text-sm font-bold text-white/80">Número {form.numero}</p>}
                </div>
              </div>
              {form.slogan && <p className="text-sm italic text-white/90 mt-2">"{form.slogan}"</p>}
              {musicMode === "audio" && form.musica_url && (
                <button onClick={toggleMusic} className="mt-3 flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-medium transition-all">
                  <span>{musicPlaying ? "Pausar" : "Tocar"}</span>
                  <span>música da campanha</span>
                </button>
              )}
              {musicMode === "youtube" && form.musica_youtube_url && (
                <button onClick={openYoutubeMusic} className="mt-3 flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-medium transition-all">
                  <span>Abrir</span>
                  <span>vídeo da campanha</span>
                </button>
              )}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-medium">
                Configurações atualizadas com sucesso.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <SectionCard eyebrow="Passo 1" title="Informações principais" description="Esses dados aparecem no topo do sistema e ajudam a identificar a campanha.">
              <div className="space-y-4">
                <ConfigField
                  label="NOME DO CANDIDATO"
                  value={form.nome_candidato || ""}
                  onChange={(value) => setForm((current) => ({ ...current, nome_candidato: value }))}
                  disabled={!canEdit}
                />
                <ConfigField
                  label="NÚMERO DA CAMPANHA"
                  value={form.numero || ""}
                  onChange={(value) => setForm((current) => ({ ...current, numero: value }))}
                  placeholder="Ex: 15123"
                  disabled={!canEdit}
                />
                <ConfigField
                  label="SLOGAN"
                  value={form.slogan || ""}
                  onChange={(value) => setForm((current) => ({ ...current, slogan: value }))}
                  placeholder="Ex: Trabalho de verdade"
                  disabled={!canEdit}
                />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Passo 2" title="Imagens da campanha" description="Envie apenas o que a equipe realmente usa no dia a dia.">
              <div className="grid gap-3">
                <UploadCard kind="foto_principal" currentValue={form.foto_principal} previewValue={uploadPreviews.foto_principal} canEdit={canEdit} uploading={uploading.foto_principal} onFileSelect={handleUpload} />
                <UploadCard kind="santinho_imagem" currentValue={form.santinho_imagem} previewValue={uploadPreviews.santinho_imagem} canEdit={canEdit} uploading={uploading.santinho_imagem} onFileSelect={handleUpload} />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Passo 3" title="Cores da campanha" description="Essas cores aparecem no login, dashboards e menus do sistema.">
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={resetThemeColors}
                  disabled={!canEdit}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50"
                >
                  Voltar cores padrão
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Cor primária</p>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                    <input
                      type="color"
                      value={form.cor_primaria || "#1d4ed8"}
                      onChange={(e) => setForm((current) => ({ ...current, cor_primaria: e.target.value }))}
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-600 font-mono">{form.cor_primaria}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Cor secundária</p>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                    <input
                      type="color"
                      value={form.cor_secundaria || "#1e40af"}
                      onChange={(e) => setForm((current) => ({ ...current, cor_secundaria: e.target.value }))}
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-600 font-mono">{form.cor_secundaria}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="Passo 4" title="Música da campanha" description="Opcional. Escolha entre um arquivo de áudio direto ou um link do YouTube.">
              <div className="grid gap-2 mb-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMusicMode("audio")}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                    musicMode === "audio" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Arquivo de áudio
                </button>
                <button
                  type="button"
                  onClick={() => setMusicMode("youtube")}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                    musicMode === "youtube" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Vídeo no YouTube
                </button>
              </div>

              {musicMode === "audio" ? (
                <>
                  <ConfigField
                    label="URL DO ÁUDIO"
                    value={form.musica_url || ""}
                    onChange={(value) => setForm((current) => ({ ...current, musica_url: value, musica_youtube_url: null }))}
                    placeholder="https://site.com/audio.mp3"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-400 mt-2">Use um link direto para arquivo de áudio, como `.mp3`, `.wav`, `.ogg` ou `.m4a`.</p>
                  {form.musica_url && (
                    <button type="button" onClick={toggleMusic} className="mt-3 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-medium transition-all w-full justify-center">
                      <span>{musicPlaying ? "Pausar música" : "Testar música da campanha"}</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <ConfigField
                    label="LINK DO YOUTUBE"
                    value={form.musica_youtube_url || ""}
                    onChange={(value) => setForm((current) => ({ ...current, musica_youtube_url: value, musica_url: null }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-400 mt-2">Essa opção abre o vídeo da campanha em outra aba. Ela não toca dentro do sistema.</p>
                  {form.musica_youtube_url && (
                    <button type="button" onClick={openYoutubeMusic} className="mt-3 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-medium transition-all w-full justify-center">
                      <span>Abrir vídeo da campanha</span>
                    </button>
                  )}
                </>
              )}
            </SectionCard>

            {canEdit && (
              <div className="sticky bottom-4">
                <div className="bg-white/95 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Finalizar alterações</p>
                      <p className="text-xs text-gray-500">Revise a prévia acima e salve quando terminar.</p>
                    </div>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!canEdit && <p className="text-center text-xs text-gray-400 mt-4">Apenas administradores podem editar as configurações.</p>}
          </>
        )}
      </div>
    </Layout>
  );
}

function UploadCard({
  kind,
  currentValue,
  previewValue,
  canEdit,
  uploading,
  onFileSelect,
}: {
  kind: UploadKind;
  currentValue: string | null | undefined;
  previewValue?: string | null;
  canEdit: boolean;
  uploading: boolean;
  onFileSelect: (kind: UploadKind, file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const meta = uploadLabels[kind];
  const imagePreview = previewValue || currentValue;

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">{meta.title}</p>
          <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
          <p className="text-[11px] text-gray-400 mt-2">{uploadValidation[kind].helper}</p>
          {currentValue && <p className="text-[11px] text-gray-400 mt-2 break-all">{currentValue}</p>}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!canEdit || uploading}
          className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "Enviar imagem"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          onFileSelect(kind, event.target.files?.[0] || null);
          event.currentTarget.value = "";
        }}
      />
      {imagePreview && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Pré-visualização</p>
          <img
            src={imagePreview}
            alt={meta.title}
            className={`w-full rounded-xl border border-gray-200 bg-white object-contain ${
              kind === "santinho_imagem" ? "max-h-72" : "max-h-56"
            }`}
          />
        </div>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function validateUploadFile(kind: UploadKind, file: File) {
  const rules = uploadValidation[kind];

  return new Promise<void>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(objectUrl);

      if (width < rules.minWidth || height < rules.minHeight) {
        reject(
          new Error(
            `${uploadLabels[kind].title} muito pequeno. Use pelo menos ${rules.minWidth}x${rules.minHeight}px.`,
          ),
        );
        return;
      }

      resolve();
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível validar a imagem enviada."));
    };

    image.src = objectUrl;
  });
}
