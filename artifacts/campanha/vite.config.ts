import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Plugin para fazer fallback em SPA
function spaFallback() {
  return {
    name: "spa-fallback",
    apply: "serve",
    configureServer(server: any) {
      return () => {
        server.middlewares.use((req: any, res: any, next: any) => {
          // Se é uma requisição GET e não é arquivo estático ou API
          if (
            req.method === "GET" &&
            !req.originalUrl.startsWith("/api") &&
            !req.originalUrl.startsWith("/uploads") &&
            !req.originalUrl.includes(".") &&
            req.originalUrl !== "/" &&
            req.originalUrl.startsWith("/")
          ) {
            // Fazer fallback para /index.html
            req.url = "/index.html";
          }
          next();
        });
      };
    },
  };
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const rawPort = env.PORT || "5173";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = env.BASE_PATH || "/";
  const apiTarget = env.API_TARGET || "http://127.0.0.1:8080";
  const isReplit = env.NODE_ENV !== "production" && env.REPL_ID !== undefined;

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      spaFallback(),
      ...(isReplit
        ? [
            runtimeErrorOverlay(),
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("recharts")) return "charts";
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-hook-form") || id.includes("@hookform/resolvers")) return "forms";
            if (id.includes("react-day-picker") || id.includes("date-fns")) return "calendar";
            if (id.includes("cmdk")) return "command";
            if (id.includes("vaul")) return "drawer";
            if (id.includes("embla-carousel-react")) return "carousel";
            if (id.includes("input-otp")) return "otp";
            if (id.includes("wouter")) return "router";

            return "vendor";
          },
        },
      },
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
