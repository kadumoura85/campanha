import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { db, configuracaoCampanhaTable } from "@workspace/db";
import { requireRoles, requireUsuario } from "./auth";
import { uploadsRoot } from "../lib/paths";

const router: IRouter = Router();

const updateConfiguracaoSchema = z.object({
  nome_candidato: z.string().nullish(),
  foto_principal: z.string().nullish(),
  slogan: z.string().nullish(),
  numero: z.string().nullish(),
  cor_primaria: z.string().nullish(),
  cor_secundaria: z.string().nullish(),
  logo: z.string().nullish(),
  santinho_imagem: z.string().nullish(),
  capa_imagem: z.string().nullish(),
  frase_institucional: z.string().nullish(),
  musica_url: z.string().nullish(),
  musica_youtube_url: z.string().nullish(),
  descricao_curta: z.string().nullish(),
});

const uploadSchema = z.object({
  kind: z.enum(["foto_principal", "logo", "santinho_imagem", "capa_imagem"]),
  fileName: z.string().min(1),
  dataUrl: z.string().min(1),
});

const publicConfigSelect = {
  nome_candidato: configuracaoCampanhaTable.nome_candidato,
  foto_principal: configuracaoCampanhaTable.foto_principal,
  slogan: configuracaoCampanhaTable.slogan,
  numero: configuracaoCampanhaTable.numero,
  cor_primaria: configuracaoCampanhaTable.cor_primaria,
  cor_secundaria: configuracaoCampanhaTable.cor_secundaria,
  logo: configuracaoCampanhaTable.logo,
  santinho_imagem: configuracaoCampanhaTable.santinho_imagem,
  frase_institucional: configuracaoCampanhaTable.frase_institucional,
  musica_url: configuracaoCampanhaTable.musica_url,
  musica_youtube_url: configuracaoCampanhaTable.musica_youtube_url,
  descricao_curta: configuracaoCampanhaTable.descricao_curta,
};

const uploadFolders: Record<z.infer<typeof uploadSchema>["kind"], string> = {
  foto_principal: "candidato",
  logo: "branding",
  santinho_imagem: "materiais",
  capa_imagem: "branding",
};

const mimeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

router.get("/config/public", async (_req, res): Promise<void> => {
  const config = await getPublicConfig();

  if (!config) {
    res.json({
      nome_candidato: "Campanha Politica",
      foto_principal: null,
      slogan: null,
      numero: null,
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
      logo: null,
      santinho_imagem: null,
      frase_institucional: null,
      musica_url: null,
      musica_youtube_url: null,
      descricao_curta: null,
    });
    return;
  }

  res.json(config);
});

router.get("/configuracao", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["coordenador_geral"]);
  if (!usuario) return;

  const config = await getOrCreateConfig();
  res.json(config);
});

router.patch("/configuracao", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["coordenador_geral"]);
  if (!usuario) return;

  const parsed = updateConfiguracaoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const config = await upsertConfig(updates);
  res.json(config);
});

router.post("/configuracao/upload", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["coordenador_geral"]);
  if (!usuario) return;

  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const relativePath = await persistImageUpload(parsed.data.kind, parsed.data.fileName, parsed.data.dataUrl);
    const config = await upsertConfig({ [parsed.data.kind]: relativePath });
    res.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel salvar a imagem";
    res.status(400).json({ error: message });
  }
});

async function getPublicConfig() {
  const [config] = await db.select(publicConfigSelect).from(configuracaoCampanhaTable).limit(1);
  return config;
}

async function getOrCreateConfig() {
  let [config] = await db.select().from(configuracaoCampanhaTable).limit(1);

  if (!config) {
    [config] = await db
      .insert(configuracaoCampanhaTable)
      .values({
        nome_candidato: "Candidato",
        cor_primaria: "#1d4ed8",
        cor_secundaria: "#1e40af",
      })
      .returning();
  }

  return config;
}

async function upsertConfig(updates: Record<string, unknown>) {
  const existing = await getOrCreateConfig();
  const [config] = await db
    .update(configuracaoCampanhaTable)
    .set(updates)
    .where(eq(configuracaoCampanhaTable.id, existing.id))
    .returning();

  return config;
}

async function persistImageUpload(
  kind: z.infer<typeof uploadSchema>["kind"],
  fileName: string,
  dataUrl: string,
) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido. Use PNG, JPG ou WEBP.");
  }

  const [, mimeType, base64Payload] = match;
  const extension = mimeToExtension[mimeType];
  const safeBaseName = slugify(path.parse(fileName).name || kind);
  const folder = uploadFolders[kind];
  const fileNameOnDisk = `${safeBaseName}-${Date.now()}${extension}`;
  const targetDir = path.join(uploadsRoot, folder);
  const targetPath = path.join(targetDir, fileNameOnDisk);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, Buffer.from(base64Payload, "base64"));

  return `/uploads/${folder}/${fileNameOnDisk}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 50) || "imagem";
}

export default router;
