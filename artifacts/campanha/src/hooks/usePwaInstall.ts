import { useEffect, useMemo, useState } from "react";
import {
  getDeferredPrompt,
  isIosDevice,
  isStandalone,
  promptInstall,
  setDeferredPrompt,
  subscribePwaPrompt,
} from "@/lib/pwa";

export function usePwaInstall() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as never);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setVersion((current) => current + 1);
    };

    const unsubscribe = subscribePwaPrompt(() => {
      setVersion((current) => current + 1);
    });

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return useMemo(
    () => ({
      canPromptInstall: Boolean(getDeferredPrompt()) && !isStandalone(),
      isIos: isIosDevice(),
      isInstalled: isStandalone(),
      promptInstall,
      refreshKey: version,
    }),
    [version],
  );
}
