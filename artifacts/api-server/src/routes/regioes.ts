import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  regioesTable,
  contatosTable,
  usuariosTable,
  observacoesRegiaoTable,
  eventosTable,
} from "@workspace/db";
import { requireRoles, requireUsuario } from "./auth";

const router: IRouter = Router();

type UsuarioPermitido = Awaited<ReturnType<typeof requireUsuario>>;

function getRegionAccessCondition(usuario: UsuarioPermitido) {
  if (!usuario) return sql`1 = 0`;

  if (["super_admin", "vereador", "coordenador_geral"].includes(usuario.tipo)) {
    return undefined;
  }

  if (usuario.tipo === "coordenador_regional") {
    if (!usuario.regiao_id) {
      return sql`1 = 0`;
    }

    return eq(regioesTable.id, usuario.regiao_id);
  }

  if (usuario.tipo === "lider") {
    if (!usuario.regiao_id) {
      return sql`1 = 0`;
    }

    return eq(regioesTable.id, usuario.regiao_id);
  }

  return sql`1 = 0`;
}

function canAccessRegionById(usuario: UsuarioPermitido, regiaoId: number) {
  if (!usuario) return false;
  if (["super_admin", "vereador", "coordenador_geral"].includes(usuario.tipo)) return true;
  if (usuario.tipo === "coordenador_regional") return usuario.regiao_id === regiaoId;
  if (usuario.tipo === "lider") return usuario.regiao_id === regiaoId;
  return false;
}

router.get("/regioes", async (req, res): Promise<void> => {
  const usuario = await requireUsuario(req, res);
  if (!usuario) return;

  const accessCondition = getRegionAccessCondition(usuario);
  const baseQuery = db
    .select({
      id: regioesTable.id,
      nome: regioesTable.nome,
      descricao: regioesTable.descricao,
      cor: regioesTable.cor,
      prioridade: regioesTable.prioridade,
      observacao_estrategica: regioesTable.observacao_estrategica,
      created_at: regioesTable.created_at,
      updated_at: regioesTable.updated_at,
      total_contatos: sql<number>`count(distinct c.id)::int`,
      total_simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
      total_fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
      total_lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
      total_coordenadores: sql<number>`count(distinct u.id) filter (where u.tipo = 'coordenador_regional')::int`,
      coordenador_nome: sql<string | null>`nullif(string_agg(distinct case when u.tipo = 'coordenador_regional' then u.nome end, ', '), '')`,
    })
    .from(regioesTable)
    .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
    .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`);

  const regioes = accessCondition
    ? await baseQuery.where(accessCondition).groupBy(regioesTable.id).orderBy(regioesTable.nome)
    : await baseQuery.groupBy(regioesTable.id).orderBy(regioesTable.nome);

  res.json(regioes);
});

router.post("/regioes", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["super_admin", "vereador", "coordenador_geral"]);
  if (!usuario) return;

  const { nome, descricao, cor, prioridade, observacao_estrategica } = req.body;
  if (!nome) {
    res.status(400).json({ error: "Nome é obrigatório" });
    return;
  }

  const [regiao] = await db
    .insert(regioesTable)
    .values({
      nome,
      descricao: descricao || null,
      cor: cor || "#3B82F6",
      prioridade: prioridade || "normal",
      observacao_estrategica: observacao_estrategica || null,
    })
    .returning();

  res.status(201).json(regiao);
});

router.get("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await requireUsuario(req, res);
  if (!usuario) return;

  const id = Number(req.params["id"]);
  if (!canAccessRegionById(usuario, id)) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

  const [regiao] = await db
    .select({
      id: regioesTable.id,
      nome: regioesTable.nome,
      descricao: regioesTable.descricao,
      cor: regioesTable.cor,
      prioridade: regioesTable.prioridade,
      observacao_estrategica: regioesTable.observacao_estrategica,
      created_at: regioesTable.created_at,
      updated_at: regioesTable.updated_at,
      total_contatos: sql<number>`count(distinct c.id)::int`,
      total_simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
      total_fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
      total_lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
      total_coordenadores: sql<number>`count(distinct u.id) filter (where u.tipo = 'coordenador_regional')::int`,
      coordenador_nome: sql<string | null>`nullif(string_agg(distinct case when u.tipo = 'coordenador_regional' then u.nome end, ', '), '')`,
    })
    .from(regioesTable)
    .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
    .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`)
    .where(eq(regioesTable.id, id))
    .groupBy(regioesTable.id);

  if (!regiao) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

  const coordenadores = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      telefone: usuariosTable.telefone,
      ativo: usuariosTable.ativo,
    })
    .from(usuariosTable)
    .where(sql`${usuariosTable.regiao_id} = ${id} and ${usuariosTable.tipo} = 'coordenador_regional'`)
    .orderBy(usuariosTable.nome);

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

  res.json({ ...regiao, coordenadores, lideres, observacoes, proximos_eventos });
});

router.patch("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["super_admin", "vereador", "coordenador_geral"]);
  if (!usuario) return;

  const id = Number(req.params["id"]);
  const updates: Record<string, unknown> = {};
  const allowed = ["nome", "descricao", "cor", "prioridade", "observacao_estrategica"];

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db.update(regioesTable).set(updates).where(eq(regioesTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

  res.json(updated);
});

router.delete("/regioes/:id", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, ["super_admin", "vereador", "coordenador_geral"]);
  if (!usuario) return;

  const id = Number(req.params["id"]);
  const [coordenador] = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(sql`${usuariosTable.regiao_id} = ${id} and ${usuariosTable.tipo} = 'coordenador_regional'`)
    .limit(1);

  if (coordenador) {
    res.status(400).json({ error: "Reatribua ou exclua os coordenadores desta regiao antes de exclui-la" });
    return;
  }

  const [lider] = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(sql`${usuariosTable.regiao_id} = ${id} and ${usuariosTable.tipo} = 'lider'`)
    .limit(1);

  if (lider) {
    res.status(400).json({ error: "Reatribua ou exclua os lideres desta regiao antes de exclui-la" });
    return;
  }

  const [contato] = await db
    .select({ id: contatosTable.id })
    .from(contatosTable)
    .where(eq(contatosTable.regiao_id, id))
    .limit(1);

  if (contato) {
    res.status(400).json({ error: "Reatribua as pessoas desta regiao antes de exclui-la" });
    return;
  }

  await db.delete(observacoesRegiaoTable).where(eq(observacoesRegiaoTable.regiao_id, id));
  await db.delete(eventosTable).where(eq(eventosTable.regiao_id, id));

  const [deleted] = await db.delete(regioesTable).where(eq(regioesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

  res.status(204).send();
});

router.get("/regioes/:id/observacoes", async (req, res): Promise<void> => {
  const usuario = await requireUsuario(req, res);
  if (!usuario) return;

  const id = Number(req.params["id"]);
  if (!canAccessRegionById(usuario, id)) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

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
  const usuario = await requireUsuario(req, res);
  if (!usuario) return;

  const regiao_id = Number(req.params["id"]);
  if (!canAccessRegionById(usuario, regiao_id)) {
    res.status(404).json({ error: "Região não encontrada" });
    return;
  }

  const { observacao } = req.body;
  if (!observacao) {
    res.status(400).json({ error: "Observação é obrigatória" });
    return;
  }

  const [obs] = await db
    .insert(observacoesRegiaoTable)
    .values({
      regiao_id,
      autor_id: usuario.id,
      observacao,
    })
    .returning();

  res.status(201).json({ ...obs, autor_nome: usuario.nome });
});

export default router;
