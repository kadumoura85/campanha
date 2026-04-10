const isSecureContextForPwa =
  window.location.protocol === "https:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && isSecureContextForPwa) {
  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const serviceWorkerUrl = `${baseUrl.replace(/\/$/, "")}/sw.js`;

    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
      // Mantemos silencioso para não poluir a experiência se o navegador bloquear.
    });
  });
}
