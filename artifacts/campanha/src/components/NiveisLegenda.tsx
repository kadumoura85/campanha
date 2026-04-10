type Item = {
  title: string;
  description: string;
  icon: string;
  accentClassName: string;
};

const DEFAULT_ITEMS: Item[] = [
  {
    title: "Contato",
    description: "Ainda não declarou apoio",
    icon: "👤",
    accentClassName: "text-violet-700 border-violet-200",
  },
  {
    title: "Simpatizante",
    description: "Simpatiza com a campanha",
    icon: "🟡",
    accentClassName: "text-amber-700 border-amber-200",
  },
  {
    title: "Fechado",
    description: "Voto garantido",
    icon: "✅",
    accentClassName: "text-green-700 border-green-200",
  },
];

export default function NiveisLegenda({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-3" : "grid-cols-3"} ${className}`}>
      {DEFAULT_ITEMS.map((item) => (
        <div key={item.title} className={`rounded-2xl border bg-white px-4 py-3 text-center shadow-sm ${item.accentClassName}`}>
          <div className="text-2xl mb-2">{item.icon}</div>
          <p className="text-sm font-bold text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
