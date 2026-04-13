import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5174;
const API_URL = process.env.API_URL || "http://127.0.0.1:8787";

const publicDir = path.join(__dirname, "dist/public");

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Proxy para API
app.use("/api", async (req, res) => {
  try {
    const apiUrl = `${API_URL}${req.originalUrl}`;
    
    const headers = {
      "Content-Type": "application/json",
    };

    const options = {
      method: req.method,
      headers,
    };

    // Preparar body
    let bodyToSend = null;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      if (req.body) {
        bodyToSend = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers["Content-Length"] = Buffer.byteLength(bodyToSend);
      }
      if (bodyToSend) {
        options.body = bodyToSend;
      }
    }

    console.log(`[PROXY] ${req.method} ${apiUrl} ${bodyToSend ? `(${Buffer.byteLength(bodyToSend)} bytes)` : ''}`);
    
    const apiRes = await fetch(apiUrl, options);
    const data = await apiRes.text();

    res.status(apiRes.status);
    res.setHeader("Content-Type", apiRes.headers.get("content-type") || "application/json");
    res.send(data);
  } catch (error) {
    console.error("[PROXY ERROR]", error.message, error.code);
    res.status(500).json({ error: "Erro ao conectar com API: " + error.message });
  }
});

// Servir arquivos estáticos
app.use(express.static(publicDir));

// Fallback para SPA - TUDO QUE NÃO FOR ARQUIVO ESTÁTICO VAI PARA INDEX.HTML
app.use((req, res) => {
  const filePath = path.join(publicDir, req.path);

  if (!fs.existsSync(filePath)) {
    return res.sendFile(path.join(publicDir, "index.html"));
  }

  return res.sendFile(filePath);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
  console.log(`  ➜  Network: http://192.168.1.11:${PORT}/\n`);
});
