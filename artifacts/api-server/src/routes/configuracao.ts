import { Router, type IRouter } from "express";
import { db, configuracaoCampanhaTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/config/public", async (_req, res): Promise<void> => {
  let [config] = await db.select({
    nome_candidato: configuracaoCampanhaTable.nome_candidato,
    foto_principal: configuracaoCampanhaTable.foto_principal,
    slogan: configuracaoCampanhaTable.slogan,
    numero: configuracaoCampanhaTable.numero,
    cor_primaria: configuracaoCampanhaTable.cor_primaria,
    cor_secundaria: configuracaoCampanhaTable.cor_secundaria,
    logo: configuracaoCampanhaTable.logo,
    frase_institucional: configuracaoCampanhaTable.frase_institucional,
    musica_url: configuracaoCampanhaTable.musica_url,
    descricao_curta: configuracaoCampanhaTable.descricao_curta,
  }).from(configuracaoCampanhaTable).limit(1);

  if (!config) {
    res.json({
      nome_candidato: "Campanha Política",
      foto_principal: null,
      slogan: null,
      numero: null,
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
      logo: null,
      frase_institucional: null,
      musica_url: null,
      descricao_curta: null,
    });
    return;
  }

  res.json(config);
});

router.get("/configuracao", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  let [config] = await db.select().from(configuracaoCampanhaTable).limit(1);

  if (!config) {
    [config] = await db.insert(configuracaoCampanhaTable).values({
      nome_candidato: "Candidato",
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
    }).returning();
  }

  res.json(config);
});

router.patch("/configuracao", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!["super_admin", "vereador", "coordenador_geral"].includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  let [existing] = await db.select().from(configuracaoCampanhaTable).limit(1);

  const updates: Record<string, unknown> = {};
  const allowed = [
    "nome_candidato", "foto_principal", "slogan", "numero",
    "cor_primaria", "cor_secundaria", "logo", "santinho_imagem",
    "capa_imagem", "frase_institucional", "musica_url", "descricao_curta",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (!existing) {
    [existing] = await db.insert(configuracaoCampanhaTable).values({
      nome_candidato: "Candidato",
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
      ...updates,
    }).returning();
  } else {
    const { eq } = await import("drizzle-orm");
    [existing] = await db.update(configuracaoCampanhaTable).set(updates).where(eq(configuracaoCampanhaTable.id, existing.id)).returning();
  }

  res.json(existing);
});

export default router;
