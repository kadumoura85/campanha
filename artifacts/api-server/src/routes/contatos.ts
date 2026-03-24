import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, contatosTable, usuariosTable } from "@workspace/db";
import { CreateContatoBody, UpdateContatoBody } from "@workspace/api-zod";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const { bairro, nivel, lider_id, coordenador_id } = req.query;

  const conditions: any[] = [];

  if (usuario.tipo === "lider") {
    conditions.push(eq(contatosTable.lider_id, usuario.id));
  } else if (usuario.tipo === "coordenador") {
    conditions.push(eq(contatosTable.coordenador_id, usuario.id));
  }

  if (bairro) conditions.push(eq(contatosTable.bairro, bairro as string));
  if (nivel) conditions.push(eq(contatosTable.nivel, nivel as string));
  if (lider_id) conditions.push(eq(contatosTable.lider_id, parseInt(lider_id as string, 10)));
  if (coordenador_id) conditions.push(eq(contatosTable.coordenador_id, parseInt(coordenador_id as string, 10)));

  const liderAlias = db.select({ id: usuariosTable.id, nome: usuariosTable.nome }).from(usuariosTable).as("lider");
  const coordenadorAlias = db.select({ id: usuariosTable.id, nome: usuariosTable.nome }).from(usuariosTable).as("coord");

  const query = db
    .select({
      id: contatosTable.id,
      nome: contatosTable.nome,
      telefone: contatosTable.telefone,
      bairro: contatosTable.bairro,
      rua_referencia: contatosTable.rua_referencia,
      nivel: contatosTable.nivel,
      observacao: contatosTable.observacao,
      lider_id: contatosTable.lider_id,
      coordenador_id: contatosTable.coordenador_id,
      created_at: contatosTable.created_at,
      updated_at: contatosTable.updated_at,
      lider_nome: sql<string | null>`lider.nome`,
      coordenador_nome: sql<string | null>`coord.nome`,
    })
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .orderBy(sql`${contatosTable.created_at} DESC`);

  const contatos = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  res.json(contatos);
});

router.post("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (usuario.tipo === "vereador") {
    res.status(403).json({ error: "Vereador não pode cadastrar contatos diretamente" });
    return;
  }

  const parsed = CreateContatoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { nome, telefone, bairro, rua_referencia, nivel, observacao } = parsed.data;

  const [existing] = await db
    .select({ id: contatosTable.id })
    .from(contatosTable)
    .where(eq(contatosTable.telefone, telefone));

  if (existing) {
    res.status(400).json({ error: "Telefone já cadastrado" });
    return;
  }

  let lider_id: number | null = null;
  let coordenador_id: number | null = null;

  if (usuario.tipo === "lider") {
    lider_id = usuario.id;
    coordenador_id = usuario.coordenador_id;
  } else if (usuario.tipo === "coordenador") {
    coordenador_id = usuario.id;
    lider_id = parsed.data.lider_id || null;
  }

  const [contato] = await db
    .insert(contatosTable)
    .values({ nome, telefone, bairro, rua_referencia, nivel, observacao, lider_id, coordenador_id })
    .returning();

  const liderNome = lider_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, lider_id)))[0]?.nome
    : null;
  const coordNome = coordenador_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, coordenador_id)))[0]?.nome
    : null;

  res.status(201).json({ ...contato, lider_nome: liderNome || null, coordenador_nome: coordNome || null });
});

router.get("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [contato] = await db
    .select({
      id: contatosTable.id,
      nome: contatosTable.nome,
      telefone: contatosTable.telefone,
      bairro: contatosTable.bairro,
      rua_referencia: contatosTable.rua_referencia,
      nivel: contatosTable.nivel,
      observacao: contatosTable.observacao,
      lider_id: contatosTable.lider_id,
      coordenador_id: contatosTable.coordenador_id,
      created_at: contatosTable.created_at,
      updated_at: contatosTable.updated_at,
      lider_nome: sql<string | null>`lider.nome`,
      coordenador_nome: sql<string | null>`coord.nome`,
    })
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .where(eq(contatosTable.id, id));

  if (!contato) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && contato.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  if (usuario.tipo === "coordenador" && contato.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  res.json(contato);
});

router.patch("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db
    .select()
    .from(contatosTable)
    .where(eq(contatosTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  if (usuario.tipo === "coordenador" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const parsed = UpdateContatoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.telefone && parsed.data.telefone !== existing.telefone) {
    const [duplicate] = await db
      .select({ id: contatosTable.id })
      .from(contatosTable)
      .where(eq(contatosTable.telefone, parsed.data.telefone));
    if (duplicate) {
      res.status(400).json({ error: "Telefone já cadastrado" });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) {
      updateData[key] = value;
    }
  }

  const [updated] = await db
    .update(contatosTable)
    .set(updateData)
    .where(eq(contatosTable.id, id))
    .returning();

  const liderNome = updated.lider_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, updated.lider_id)))[0]?.nome
    : null;
  const coordNome = updated.coordenador_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, updated.coordenador_id)))[0]?.nome
    : null;

  res.json({ ...updated, lider_nome: liderNome || null, coordenador_nome: coordNome || null });
});

router.delete("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db
    .select()
    .from(contatosTable)
    .where(eq(contatosTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  if (usuario.tipo === "coordenador" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  await db.delete(contatosTable).where(eq(contatosTable.id, id));
  res.sendStatus(204);
});

export default router;
