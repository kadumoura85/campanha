type Nivel = "contato" | "simpatizante" | "fechado";

const config: Record<Nivel, { label: string; className: string }> = {
  contato: {
    label: "Contato",
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  },
  simpatizante: {
    label: "Simpatizante",
    className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  fechado: {
    label: "Fechado",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
};

interface NivelBadgeProps {
  nivel: string;
}

export default function NivelBadge({ nivel }: NivelBadgeProps) {
  const cfg = config[nivel as Nivel] || config.contato;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
