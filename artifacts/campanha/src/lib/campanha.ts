import type { CampanhaConfig } from "@/contexts/CampanhaContext";

const FALLBACK_NAME = "Sua campanha";

function normalizeText(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

export function sanitizeCampanhaConfig(config: CampanhaConfig): CampanhaConfig {
  return {
    ...config,
    nome_candidato: normalizeText(config.nome_candidato) ?? "",
    foto_principal: normalizeText(config.foto_principal),
    slogan: normalizeText(config.slogan),
    numero: normalizeText(config.numero),
    cor_primaria: normalizeText(config.cor_primaria) ?? "#1d4ed8",
    cor_secundaria: normalizeText(config.cor_secundaria) ?? "#1e40af",
    logo: normalizeText(config.logo),
    santinho_imagem: normalizeText(config.santinho_imagem),
    frase_institucional: normalizeText(config.frase_institucional),
    musica_url: normalizeText(config.musica_url),
    musica_youtube_url: normalizeText(config.musica_youtube_url),
    descricao_curta: normalizeText(config.descricao_curta),
  };
}

export function getCampaignDisplayName(nome: string | null | undefined) {
  return normalizeText(nome) ?? FALLBACK_NAME;
}

export function getCampaignInitials(nome: string | null | undefined) {
  const displayName = getCampaignDisplayName(nome);
  const words = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "CP";
}

export function getCampaignAssetUrl(asset: string | null | undefined) {
  const value = normalizeText(asset);
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
}
