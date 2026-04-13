import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

interface InstallAppButtonProps {
  variant?: "light" | "dark";
  compact?: boolean;
}

export default function InstallAppButton({
  variant = "light",
  compact = false,
}: InstallAppButtonProps) {
  const { canPromptInstall, isIos, isIosSafari, isInstalled, promptInstall } =
    usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (isInstalled) return null;
  if (!canPromptInstall && !isIos) return null;

  const light = variant === "light";
  const buttonClass = light
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-white/15 text-white hover:bg-white/25";
  const helpClass = light
    ? "border-blue-100 bg-blue-50 text-blue-800"
    : "border-white/20 bg-white/10 text-white/90";

  return (
    <div className={compact ? "w-auto" : "w-full"}>
      {canPromptInstall ? (
        <button
          type="button"
          onClick={() => {
            void promptInstall();
          }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${buttonClass} ${compact ? "" : "w-full"}`}
        >
          {compact ? "Instalar" : "Instalar app"}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowIosHelp((current) => !current)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${buttonClass} ${compact ? "" : "w-full"}`}
          >
            {compact ? "iPhone" : "Como instalar no iPhone"}
          </button>
          {showIosHelp && (
            <div className={`mt-2 rounded-2xl border px-4 py-3 text-sm ${helpClass}`}>
              {isIosSafari ? (
                <>
                  No Safari, toque em <span className="font-semibold">Compartilhar</span> e depois em{" "}
                  <span className="font-semibold">Adicionar a Tela de Inicio</span>.
                </>
              ) : (
                <>
                  Para instalar no iPhone, abra este sistema no <span className="font-semibold">Safari</span> e use{" "}
                  <span className="font-semibold">Compartilhar &gt; Adicionar a Tela de Inicio</span>.
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
