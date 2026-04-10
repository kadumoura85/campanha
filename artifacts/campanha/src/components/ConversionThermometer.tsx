interface ConversionThermometerProps {
  title: string;
  percent: number;
  ratioText?: string;
  criticalLabel?: string;
  warningLabel?: string;
  healthyLabel?: string;
  onAction?: () => void;
}

export default function ConversionThermometer({
  title,
  percent,
  ratioText,
  criticalLabel = "Termômetro em faixa crítica. Vale focar nos simpatizantes.",
  warningLabel = "Termômetro em atenção. Ainda há espaço para fechar mais apoios.",
  healthyLabel = "Termômetro saudável. Sua base já tem uma boa parcela de fechados.",
  onAction,
}: ConversionThermometerProps) {
  const safePercent = Math.max(0, Math.min(percent, 100));
  const zone = safePercent < 15 ? "critical" : safePercent < 30 ? "warning" : "healthy";
  const clickable = zone !== "healthy" && Boolean(onAction);

  return (
    <button
      type="button"
      onClick={onAction}
      disabled={!clickable}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors ${
        clickable
          ? zone === "critical"
            ? "border-red-200 bg-red-50 hover:bg-red-100/70"
            : "border-amber-200 bg-amber-50 hover:bg-amber-100/70"
          : "border-gray-100 bg-white"
      } ${!clickable ? "cursor-default" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <p className="mt-1 text-xs text-gray-500">
            {zone === "critical" ? criticalLabel : zone === "warning" ? warningLabel : healthyLabel}
          </p>
          {ratioText && <p className="mt-1 text-xs font-medium text-gray-500">{ratioText}</p>}
        </div>
        <p
          className={`text-sm font-bold ${
            zone === "critical" ? "text-red-600" : zone === "warning" ? "text-amber-600" : "text-green-600"
          }`}
        >
          {Math.round(safePercent)}%
        </p>
      </div>

      <div className="relative mt-3">
        <div className="grid h-4 grid-cols-3 overflow-hidden rounded-full">
          <div className="bg-red-300/90" />
          <div className="bg-amber-300/90" />
          <div className="bg-green-300/90" />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full bg-slate-900 shadow"
          style={{ left: `calc(${safePercent}% - 3px)` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-medium text-gray-500">
        <span>0% a 14%</span>
        <span>15% a 29%</span>
        <span>30%+</span>
      </div>

      {clickable && (
        <p className={`mt-3 text-sm font-semibold ${zone === "critical" ? "text-red-700" : "text-amber-700"}`}>
          Toque aqui para ver os simpatizantes
        </p>
      )}
    </button>
  );
}
