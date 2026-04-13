import { PWA_UPDATE_AVAILABLE_EVENT } from "@/lib/pwa";

const isSecureContextForPwa =
  window.isSecureContext ||
  window.location.protocol === "https:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && isSecureContextForPwa) {
  let reloading = false;

  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const serviceWorkerUrl = `${baseUrl.replace(/\/$/, "")}/sw.js`;

    navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then((registration) => {
        const triggerUpdate = () => {
          if (navigator.onLine) {
            void registration.update().catch(() => {});
          }
        };

        window.addEventListener("online", triggerUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            triggerUpdate();
          }
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          window.dispatchEvent(new CustomEvent(PWA_UPDATE_AVAILABLE_EVENT));
        });
      })
      .catch(() => {
        // Silencioso para nao poluir a experiencia quando o navegador bloquear.
      });
  });
}
