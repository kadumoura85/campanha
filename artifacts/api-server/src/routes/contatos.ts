import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db, contatosTable, usuariosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();
type ContatoNivel = "contato" | "simpatizante" | "fechado";

const createContatoSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(1),
  bairro: z.string().nullish(),
  rua_referencia: z.string().nullish(),
  nivel: z.enum(["contato", "simpatizante", "fechado"]),
  observacao: z.string().nullish(),
  origem: z.string().nullish(),
  lider_id: z.number().nullish(),
});

const updateContatoSchema = z.object({
  nome: z.string().nullish(),
  telefone: z.string().nullish(),
  bairro: z.string().nullish(),
  rua_referencia: z.string().nullish(),
  nivel: z.enum(["contato", "simpatizante", "fechado"]).nullish(),
  observacao: z.string().nullish(),
  origem: z.string().nullish(),
  lider_id: z.number().nullish(),
});

const contatoSelect = {
  id: contatosTable.id,
  nome: contatosTable.nome,
  telefone: contatosTable.telefone,
  bairro: contatosTable.bairro,
  rua_referencia: contatosTable.rua_referencia,
  nivel: contatosTable.nivel,
  observacao: contatosTable.observacao,
  origem: contatosTable.origem,
  lider_id: contatosTable.lider_id,
  coordenador_id: contatosTable.coordenador_id,
  regiao_id: contatosTable.regiao_id,
  created_at: contatosTable.created_at,
  updated_at: contatosTable.updated_at,
  lider_nome: sql<string | null>`lider.nome`,
  coordenador_nome: sql<string | null>`coord.nome`,
  regiao_nome: sql<string | null>`r.nome`,
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function findContatoByNormalizedPhone(phone: string, excludeId?: number) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) return null;

  const conditions = [
    sql`regexp_replace(${contatosTable.telefone}, '\\D', '', 'g') = ${normalizedPhone}`,
  ];

  if (excludeId !== undefined) {
    conditions.push(sql`${contatosTable.id} <> ${excludeId}`);
  }

  const query = db
    .select({
      id: contatosTable.id,
      nome: contatosTable.nome,
      telefone: contatosTable.telefone,
      lider_id: contatosTable.lider_id,
      lider_nome: sql<string | null>`lider.nome`,
    })
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .where(and(...conditions))
    .limit(1);

  const [existing] = await query;
  return existing || null;
}

function getDuplicateContatoError(existing: {
  nome: string;
  lider_id: number | null;
  lider_nome: string | null;
}, usuarioTipo: string) {
  if (existing.lider_id && usuarioTipo === "lider") {
    if (existing.lider_nome) {
      return `Esta pessoa ja esta cadastrada na base do lider ${existing.lider_nome}.`;
    }

    return "Esta pessoa ja esta cadastrada na base de outro lider.";
  }

  return `Ja existe uma pessoa cadastrada com este telefone${existing.nome ? `: ${existing.nome}` : ""}.`;
}

router.get("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const { bairro, nivel, lider_id, coordenador_id, regiao_id, busca } = req.query;
  const conditions: any[] = [];

  if (usuario.tipo === "lider") {
    conditions.push(eq(contatosTable.lider_id, usuario.id));
  } else if (usuario.tipo === "coordenador_regional") {
    conditions.push(eq(contatosTable.coordenador_id, usuario.id));
  }

  if (bairro) conditions.push(eq(contatosTable.bairro, bairro as string));
  if (nivel) conditions.push(eq(contatosTable.nivel, nivel as ContatoNivel));
  if (lider_id) conditions.push(eq(contatosTable.lider_id, parseInt(lider_id as string, 10)));
  if (coordenador_id) conditions.push(eq(contatosTable.coordenador_id, parseInt(coordenador_id as string, 10)));
  if (regiao_id) conditions.push(eq(contatosTable.regiao_id, parseInt(regiao_id as string, 10)));
  if (busca) conditions.push(ilike(contatosTable.nome, `%${busca}%`));

  const query = db
    .select(contatoSelect)
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .leftJoin(sql`regioes r`, sql`r.id = ${contatosTable.regiao_id}`)
    .orderBy(asc(contatosTable.nome), asc(contatosTable.id));

  const contatos = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  res.json(contatos);
});

router.post("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const canCreate = ["lider", "coordenador_regional", "coordenador_geral", "super_admin"].includes(usuario.tipo);
  if (!canCreate) {
    res.status(403).json({ error: "Perfil sem permissao para cadastrar pessoas" });
    return;
  }

  const parsed = createContatoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await findContatoByNormalizedPhone(parsed.data.telefone);

  if (existing) {
    res.status(400).json({ error: getDuplicateContatoError(existing, usuario.tipo) });
    return;
  }

  const hierarchy = await resolveHierarchyFromRequest(usuario, parsed.data.lider_id ?? null, res);
  if (!hierarchy) return;

  const [contato] = await db
    .insert(contatosTable)
    .values({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      bairro: parsed.data.bairro || null,
      rua_referencia: parsed.data.rua_referencia || null,
      nivel: parsed.data.nivel,
      observacao: parsed.data.observacao || null,
      origem: parsed.data.origem || null,
      lider_id: hierarchy.lider.id,
      coordenador_id: hierarchy.coordenador.id,
      regiao_id: hierarchy.regiao_id,
    })
    .returning();

  res.status(201).json({
    ...contato,
    lider_nome: hierarchy.lider.nome,
    coordenador_nome: hierarchy.coordenador.nome,
    regiao_nome: hierarchy.regiao_nome,
  });
});

router.get("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const id = parseInt(req.params["id"]!, 10);
  const [contato] = await db
    .select(contatoSelect)
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .leftJoin(sql`regioes r`, sql`r.id = ${contatosTable.regiao_id}`)
    .where(eq(contatosTable.id, id));

  if (!contato) {
    res.status(404).json({ error: "Contato nao encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && contato.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  if (usuario.tipo === "coordenador_regional" && contato.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  res.json(contato);
});

router.patch("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const id = parseInt(req.params["id"]!, 10);
  const [existing] = await db.select().from(contatosTable).where(eq(contatosTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Contato nao encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  if (usuario.tipo === "coordenador_regional" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const parsed = updateContatoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    parsed.data.telefone &&
    normalizePhone(parsed.data.telefone) !== normalizePhone(existing.telefone)
  ) {
    const duplicate = await findContatoByNormalizedPhone(parsed.data.telefone, existing.id);

    if (duplicate) {
      res.status(400).json({ error: getDuplicateContatoError(duplicate, usuario.tipo) });
      return;
    }
  }

  const requestedLeaderId = parsed.data.lider_id === undefined ? existing.lider_id : parsed.data.lider_id;
  const hierarchy = await resolveHierarchyFromRequest(usuario, requestedLeaderId ?? null, res);
  if (!hierarchy) return;

  const updates: Record<string, unknown> = {
    lider_id: hierarchy.lider.id,
    coordenador_id: hierarchy.coordenador.id,
    regiao_id: hierarchy.regiao_id,
  };

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && key !== "lider_id") {
      updates[key] = value;
    }
  }

  const [updated] = await db.update(contatosTable).set(updates).where(eq(contatosTable.id, id)).returning();

  res.json({
    ...updated,
    lider_nome: hierarchy.lider.nome,
    coordenador_nome: hierarchy.coordenador.nome,
    regiao_nome: hierarchy.regiao_nome,
  });
});

router.delete("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const id = parseInt(req.params["id"]!, 10);
  const [existing] = await db.select().from(contatosTable).where(eq(contatosTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Contato nao encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  if (usuario.tipo === "coordenador_regional" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  await db.delete(contatosTable).where(eq(contatosTable.id, id));
  res.sendStatus(204);
});

async function resolveHierarchyFromRequest(
  usuario: Awaited<ReturnType<typeof getUsuarioFromRequest>>,
  requestedLeaderId: number | null,
  res: any,
) {
  if (!usuario) return null;

  let leaderId = requestedLeaderId;
  if (usuario.tipo === "lider") {
    leaderId = usuario.id;
  }

  if (!leaderId) {
    res.status(400).json({ error: "Todo contato precisa estar vinculado a um lider." });
    return null;
  }

  const [lider] = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      tipo: usuariosTable.tipo,
      coordenador_id: usuariosTable.coordenador_id,
      regiao_id: usuariosTable.regiao_id,
      ativo: usuariosTable.ativo,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, leaderId));

  if (!lider || lider.tipo !== "lider" || !lider.ativo) {
    res.status(400).json({ error: "Selecione um lider valido." });
    return null;
  }

  if (usuario.tipo === "coordenador_regional" && lider.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Voce so pode usar lideres da sua equipe." });
    return null;
  }

  if (!lider.coordenador_id) {
    res.status(400).json({ error: "O lider selecionado precisa estar vinculado a um coordenador." });
    return null;
  }

  const [coordenador] = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      tipo: usuariosTable.tipo,
      regiao_id: usuariosTable.regiao_id,
      ativo: usuariosTable.ativo,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, lider.coordenador_id));

  if (!coordenador || coordenador.tipo !== "coordenador_regional" || !coordenador.ativo) {
    res.status(400).json({ error: "O lider selecionado precisa estar ligado a um coordenador ativo." });
    return null;
  }

  if (!coordenador.regiao_id) {
    res.status(400).json({ error: "O coordenador selecionado precisa estar vinculado a uma regiao." });
    return null;
  }

  if (lider.regiao_id && lider.regiao_id !== coordenador.regiao_id) {
    res.status(400).json({ error: "O lider e o coordenador precisam estar na mesma regiao." });
    return null;
  }

  const [regiao] = await db
    .select({ id: sql<number>`r.id`, nome: sql<string>`r.nome` })
    .from(sql`regioes r`)
    .where(sql`r.id = ${coordenador.regiao_id}`);

  if (!regiao) {
    res.status(400).json({ error: "A regiao do coordenador nao foi encontrada." });
    return null;
  }

  return {
    lider,
    coordenador,
    regiao_id: regiao.id,
    regiao_nome: regiao.nome,
  };
}

export default router;
