import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "fs";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadsRoot } from "./lib/paths";

const app: Express = express();

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") return "*";

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : "*";
}

const corsOrigin = parseCorsOrigins();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (existsSync(uploadsRoot)) {
  app.use("/uploads", express.static(uploadsRoot));
}

app.use("/api", router);

export default app;
