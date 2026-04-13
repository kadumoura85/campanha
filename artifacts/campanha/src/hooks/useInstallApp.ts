import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<unknown[]>;
};

export function useInstallApp() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar se o app ja esta instalado.
    const checkInstalled = async () => {
      const navigatorWithRelatedApps = navigator as NavigatorWithRelatedApps;

      if (typeof navigatorWithRelatedApps.getInstalledRelatedApps === "function") {
        try {
          const apps = await navigatorWithRelatedApps.getInstalledRelatedApps();
          setIsInstalled(apps.length > 0);
        } catch (error) {
          console.log("Nao foi possivel verificar instalacao", error);
        }
      }
    };

    checkInstalled();

    // Listener para o evento beforeinstallprompt.
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detectar quando o app e instalado.
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error("Erro ao instalar app:", error);
    }
  }, [installPrompt]);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    installPrompt,
    handleInstall,
  };
}
