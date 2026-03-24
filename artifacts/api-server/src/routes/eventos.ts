import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, eventosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/eventos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { regiao_id, tipo_evento } = req.query;

  let query = db
    .select({
      id: eventosTable.id,
      titulo: eventosTable.titulo,
      descricao: eventosTable.descricao,
      data: eventosTable.data,
      hora: eventosTable.hora,
      local: eventosTable.local,
      tipo_evento: eventosTable.tipo_evento,
      regiao_id: eventosTable.regiao_id,
      regiao_nome: sql<string | null>`r.nome`,
      criado_por: eventosTable.criado_por,
      criado_por_nome: sql<string | null>`u.nome`,
      visibilidade: eventosTable.visibilidade,
      coordenador_regional_id: eventosTable.coordenador_regional_id,
      lider_id: eventosTable.lider_id,
      created_at: eventosTable.created_at,
    })
    .from(eventosTable)
    .leftJoin(sql`regioes r`, sql`r.id = ${eventosTable.regiao_id}`)
    .leftJoin(sql`usuarios u`, sql`u.id = ${eventosTable.criado_por}`)
    .$dynamic();

  const conditions = [];
  if (regiao_id) conditions.push(eq(eventosTable.regiao_id, Number(regiao_id)));
  if (tipo_evento) conditions.push(eq(eventosTable.tipo_evento, tipo_evento as string));

  if (usuario.tipo === "lider") {
    conditions.push(
      sql`(${eventosTable.visibilidade} = 'geral' or ${eventosTable.lider_id} = ${usuario.id} or (${eventosTable.visibilidade} = 'regional' and ${eventosTable.coordenador_regional_id} = ${usuario.coordenador_id}))`
    );
  } else if (usuario.tipo === "coordenador_regional") {
    conditions.push(
      sql`(${eventosTable.visibilidade} = 'geral' or ${eventosTable.coordenador_regional_id} = ${usuario.id} or ${eventosTable.criado_por} = ${usuario.id})`
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const eventos = await query.orderBy(eventosTable.data);
  res.json(eventos);
});

router.post("/eventos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { titulo, descricao, data, hora, local, tipo_evento, regiao_id, visibilidade, coordenador_regional_id, lider_id } = req.body;
  if (!titulo || !data || !tipo_evento || !visibilidade) {
    res.status(400).json({ error: "Campos obrigatórios: titulo, data, tipo_evento, visibilidade" }); return;
  }

  const [evento] = await db.insert(eventosTable).values({
    titulo,
    descricao: descricao || null,
    data,
    hora: hora || null,
    local: local || null,
    tipo_evento,
    regiao_id: regiao_id || null,
    criado_por: usuario.id,
    visibilidade,
    coordenador_regional_id: coordenador_regional_id || null,
    lider_id: lider_id || null,
  }).returning();

  res.status(201).json({ ...evento, criado_por_nome: usuario.nome, regiao_nome: null });
});

router.patch("/eventos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = Number(req.params["id"]);
  const updates: Record<string, unknown> = {};
  const allowed = ["titulo", "descricao", "data", "hora", "local", "tipo_evento", "regiao_id", "visibilidade"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db.update(eventosTable).set(updates).where(eq(eventosTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Evento não encontrado" }); return; }
  res.json(updated);
});

router.delete("/eventos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const id = Number(req.params["id"]);
  const [deleted] = await db.delete(eventosTable).where(eq(eventosTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Evento não encontrado" }); return; }
  res.status(204).send();
});

export default router;
