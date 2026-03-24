import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, regioesTable, contatosTable, usuariosTable, observacoesRegiaoTable, eventosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/regioes", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const regioes = await db
    .select({
      id: regioesTable.id,
      nome: regioesTable.nome,
      descricao: regioesTable.descricao,
      coordenador_regional_id: regioesTable.coordenador_regional_id,
      coordenador_nome: sql<string | null>`coord.nome`,
      cor: regioesTable.cor,
      prioridade: regioesTable.prioridade,
      observacao_estrategica: regioesTable.observacao_estrategica,
      created_at: regioesTable.created_at,
      updated_at: regioesTable.updated_at,
      total_contatos: sql<number>`count(distinct c.id)::int`,
      total_simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
      total_fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
      total_lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
    })
    .from(regioesTable)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${regioesTable.coordenador_regional_id}`)
    .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
    .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`)
    .groupBy(regioesTable.id, sql`coord.nome`)
    .orderBy(regioesTable.nome);

  res.json(regioes);
});

router.post("/regioes", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!["super_admin", "vereador", "coordenador_geral"].includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const { nome, descricao, coordenador_regional_id, cor, prioridade, observacao_estrategica } = req.body;
  if (!nome) { res.status(400).json({ error: "Nome é obrigatório" }); return; }

  const [regiao] = await db.insert(regioesTable).values({
    nome,
    descricao: descricao || null,
    coordenador_regional_id: coordenador_regional_id || null,
    cor: cor || "#3B82F6",
    prioridade: prioridade || "normal",
    observacao_estrategica: observacao_estrategica || null,
  }).returning();

  res.status(201).json(regiao);
});

router.get("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = Number(req.params["id"]);
  const [regiao] = await db
    .select({
      id: regioesTable.id,
      nome: regioesTable.nome,
      descricao: regioesTable.descricao,
      coordenador_regional_id: regioesTable.coordenador_regional_id,
      coordenador_nome: sql<string | null>`coord.nome`,
      cor: regioesTable.cor,
      prioridade: regioesTable.prioridade,
      observacao_estrategica: regioesTable.observacao_estrategica,
      created_at: regioesTable.created_at,
      updated_at: regioesTable.updated_at,
      total_contatos: sql<number>`count(distinct c.id)::int`,
      total_simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
      total_fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
      total_lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
    })
    .from(regioesTable)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${regioesTable.coordenador_regional_id}`)
    .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
    .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`)
    .where(eq(regioesTable.id, id))
    .groupBy(regioesTable.id, sql`coord.nome`);

  if (!regiao) { res.status(404).json({ error: "Região não encontrada" }); return; }

  const lideres = await db
    .select({
      lider_id: sql<number>`u.id`,
      lider_nome: sql<string | null>`u.nome`,
      total: sql<number>`count(distinct c.id)::int`,
      simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
      fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
    })
    .from(sql`usuarios u`)
    .leftJoin(sql`contatos c`, sql`c.lider_id = u.id`)
    .where(sql`u.regiao_id = ${id} and u.tipo = 'lider'`)
    .groupBy(sql`u.id, u.nome`)
    .orderBy(sql`count(distinct c.id) desc`);

  const observacoes = await db
    .select({
      id: observacoesRegiaoTable.id,
      regiao_id: observacoesRegiaoTable.regiao_id,
      autor_id: observacoesRegiaoTable.autor_id,
      autor_nome: sql<string | null>`u.nome`,
      observacao: observacoesRegiaoTable.observacao,
      created_at: observacoesRegiaoTable.created_at,
    })
    .from(observacoesRegiaoTable)
    .leftJoin(sql`usuarios u`, sql`u.id = ${observacoesRegiaoTable.autor_id}`)
    .where(eq(observacoesRegiaoTable.regiao_id, id))
    .orderBy(sql`${observacoesRegiaoTable.created_at} desc`);

  const proximos_eventos = await db
    .select()
    .from(eventosTable)
    .where(eq(eventosTable.regiao_id, id))
    .orderBy(eventosTable.data)
    .limit(5);

  res.json({ ...regiao, lideres, observacoes, proximos_eventos });
});

router.patch("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = Number(req.params["id"]);
  const updates: Record<string, unknown> = {};
  const allowed = ["nome", "descricao", "coordenador_regional_id", "cor", "prioridade", "observacao_estrategica"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db.update(regioesTable).set(updates).where(eq(regioesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Região não encontrada" }); return; }
  res.json(updated);
});

router.delete("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!["super_admin", "vereador", "coordenador_geral"].includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const id = Number(req.params["id"]);
  const [deleted] = await db.delete(regioesTable).where(eq(regioesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Região não encontrada" }); return; }
  res.status(204).send();
});

router.get("/regioes/:id/observacoes", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = Number(req.params["id"]);
  const obs = await db
    .select({
      id: observacoesRegiaoTable.id,
      regiao_id: observacoesRegiaoTable.regiao_id,
      autor_id: observacoesRegiaoTable.autor_id,
      autor_nome: sql<string | null>`u.nome`,
      observacao: observacoesRegiaoTable.observacao,
      created_at: observacoesRegiaoTable.created_at,
    })
    .from(observacoesRegiaoTable)
    .leftJoin(sql`usuarios u`, sql`u.id = ${observacoesRegiaoTable.autor_id}`)
    .where(eq(observacoesRegiaoTable.regiao_id, id))
    .orderBy(sql`${observacoesRegiaoTable.created_at} desc`);

  res.json(obs);
});

router.post("/regioes/:id/observacoes", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const regiao_id = Number(req.params["id"]);
  const { observacao } = req.body;
  if (!observacao) { res.status(400).json({ error: "Observação é obrigatória" }); return; }

  const [obs] = await db.insert(observacoesRegiaoTable).values({
    regiao_id,
    autor_id: usuario.id,
    observacao,
  }).returning();

  res.status(201).json({ ...obs, autor_nome: usuario.nome });
});

export default router;
