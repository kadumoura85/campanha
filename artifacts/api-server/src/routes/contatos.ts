import { Router, type IRouter } from "express";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db, contatosTable, usuariosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

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

router.get("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { bairro, nivel, lider_id, coordenador_id, regiao_id, busca } = req.query;
  const conditions: any[] = [];

  if (usuario.tipo === "lider") {
    conditions.push(eq(contatosTable.lider_id, usuario.id));
  } else if (usuario.tipo === "coordenador_regional") {
    conditions.push(eq(contatosTable.coordenador_id, usuario.id));
  }

  if (bairro) conditions.push(eq(contatosTable.bairro, bairro as string));
  if (nivel) conditions.push(eq(contatosTable.nivel, nivel as string));
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
    .orderBy(sql`${contatosTable.created_at} DESC`);

  const contatos = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  res.json(contatos);
});

router.post("/contatos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const canCreate = ["lider", "coordenador_regional", "super_admin"].includes(usuario.tipo);
  if (!canCreate) {
    res.status(403).json({ error: "Perfil não autorizado a cadastrar contatos" }); return;
  }

  const { nome, telefone, bairro, rua_referencia, nivel, observacao, origem, lider_id: bodyLiderId, coordenador_id: bodyCoordId, regiao_id: bodyRegiaoId } = req.body;

  if (!nome || !telefone || !nivel) {
    res.status(400).json({ error: "Campos obrigatórios: nome, telefone, nivel" }); return;
  }

  const [existing] = await db.select({ id: contatosTable.id }).from(contatosTable).where(eq(contatosTable.telefone, telefone));
  if (existing) { res.status(400).json({ error: "Telefone já cadastrado" }); return; }

  let lider_id: number | null = null;
  let coordenador_id: number | null = null;
  let regiao_id: number | null = bodyRegiaoId || null;

  if (usuario.tipo === "lider") {
    lider_id = usuario.id;
    coordenador_id = usuario.coordenador_id;
    regiao_id = regiao_id || usuario.regiao_id;
  } else if (usuario.tipo === "coordenador_regional") {
    coordenador_id = usuario.id;
    lider_id = bodyLiderId || null;
    regiao_id = regiao_id || usuario.regiao_id;
  } else {
    lider_id = bodyLiderId || null;
    coordenador_id = bodyCoordId || null;
  }

  const [contato] = await db.insert(contatosTable).values({
    nome, telefone, bairro: bairro || null, rua_referencia: rua_referencia || null,
    nivel, observacao: observacao || null, origem: origem || null, lider_id, coordenador_id, regiao_id,
  }).returning();

  const liderNome = lider_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, lider_id)))[0]?.nome
    : null;
  const coordNome = coordenador_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, coordenador_id)))[0]?.nome
    : null;

  res.status(201).json({ ...contato, lider_nome: liderNome || null, coordenador_nome: coordNome || null, regiao_nome: null });
});

router.get("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = parseInt(req.params["id"]!, 10);

  const [contato] = await db
    .select(contatoSelect)
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .leftJoin(sql`regioes r`, sql`r.id = ${contatosTable.regiao_id}`)
    .where(eq(contatosTable.id, id));

  if (!contato) { res.status(404).json({ error: "Contato não encontrado" }); return; }

  if (usuario.tipo === "lider" && contato.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }
  if (usuario.tipo === "coordenador_regional" && contato.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  res.json(contato);
});

router.patch("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = parseInt(req.params["id"]!, 10);
  const [existing] = await db.select().from(contatosTable).where(eq(contatosTable.id, id));
  if (!existing) { res.status(404).json({ error: "Contato não encontrado" }); return; }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }
  if (usuario.tipo === "coordenador_regional" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  if (req.body.telefone && req.body.telefone !== existing.telefone) {
    const [dup] = await db.select({ id: contatosTable.id }).from(contatosTable).where(eq(contatosTable.telefone, req.body.telefone));
    if (dup) { res.status(400).json({ error: "Telefone já cadastrado" }); return; }
  }

  const allowed = ["nome", "telefone", "bairro", "rua_referencia", "nivel", "observacao", "origem", "lider_id", "coordenador_id", "regiao_id"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db.update(contatosTable).set(updates).where(eq(contatosTable.id, id)).returning();

  const liderNome = updated.lider_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, updated.lider_id)))[0]?.nome
    : null;
  const coordNome = updated.coordenador_id
    ? (await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, updated.coordenador_id)))[0]?.nome
    : null;

  res.json({ ...updated, lider_nome: liderNome || null, coordenador_nome: coordNome || null, regiao_nome: null });
});

router.delete("/contatos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = parseInt(req.params["id"]!, 10);
  const [existing] = await db.select().from(contatosTable).where(eq(contatosTable.id, id));
  if (!existing) { res.status(404).json({ error: "Contato não encontrado" }); return; }

  if (usuario.tipo === "lider" && existing.lider_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }
  if (usuario.tipo === "coordenador_regional" && existing.coordenador_id !== usuario.id) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  await db.delete(contatosTable).where(eq(contatosTable.id, id));
  res.sendStatus(204);
});

export default router;
