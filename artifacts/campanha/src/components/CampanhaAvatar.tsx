import { useEffect, useMemo, useState } from "react";
import { getCampaignAssetUrl, getCampaignInitials } from "@/lib/campanha";

interface CampanhaAvatarProps {
  nome: string | null | undefined;
  logo?: string | null;
  foto?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  textClassName?: string;
}

export default function CampanhaAvatar({
  nome,
  logo,
  foto,
  alt,
  className = "",
  fallbackClassName = "",
  textClassName = "",
}: CampanhaAvatarProps) {
  const sources = useMemo(
    () => [getCampaignAssetUrl(foto), getCampaignAssetUrl(logo)].filter((value): value is string => Boolean(value)),
    [foto, logo],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const src = sources[sourceIndex] ?? null;

  if (src) {
    return (
      <img
        src={src}
        alt={alt || "Identidade da campanha"}
        className={className}
        onError={() => setSourceIndex((current) => current + 1)}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackClassName}`.trim()}>
      <span className={textClassName}>{getCampaignInitials(nome)}</span>
    </div>
  );
}
