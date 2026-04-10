export type PrioridadeConhecida = "normal" | "atencao" | "prioritaria";

type PrioridadeConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  pill: string;
};

const PRIORIDADE_CONFIG: Record<PrioridadeConhecida, PrioridadeConfig> = {
  normal: {
    label: "Normal",
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
    pill: "bg-gray-100 text-gray-600",
  },
  atencao: {
    label: "Atencao",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    pill: "bg-yellow-100 text-yellow-700",
  },
  prioritaria: {
    label: "Prioritaria",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    pill: "bg-red-100 text-red-700",
  },
};

const FALLBACK_PRIORIDADE_CONFIG: PrioridadeConfig = {
  label: "Prioridade especial",
  color: "text-slate-700",
  bg: "bg-slate-50",
  border: "border-slate-200",
  pill: "bg-slate-100 text-slate-700",
};

function formatPrioridadeLabel(prioridade: string) {
  return prioridade
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isPrioridadeConhecida(
  prioridade: string | null | undefined,
): prioridade is PrioridadeConhecida {
  return prioridade === "normal" || prioridade === "atencao" || prioridade === "prioritaria";
}

export function getPrioridadeBucket(
  prioridade: string | null | undefined,
): PrioridadeConhecida {
  return isPrioridadeConhecida(prioridade) ? prioridade : "normal";
}

export function getPrioridadeConfig(prioridade: string | null | undefined) {
  if (!prioridade) {
    return PRIORIDADE_CONFIG.normal;
  }

  if (isPrioridadeConhecida(prioridade)) {
    return PRIORIDADE_CONFIG[prioridade];
  }

  return {
    ...FALLBACK_PRIORIDADE_CONFIG,
    label: formatPrioridadeLabel(prioridade),
  };
}
