import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, contatosTable, usuariosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/dashboard/vereador", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (usuario.tipo !== "vereador") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const [totals] = await db
    .select({
      total_contatos: sql<number>`count(*)::int`,
      total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    })
    .from(contatosTable);

  const [coordCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(eq(usuariosTable.tipo, "coordenador"));

  const [liderCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(eq(usuariosTable.tipo, "lider"));

  const porCoordenador = await db
    .select({
      coordenador_id: contatosTable.coordenador_id,
      coordenador_nome: sql<string | null>`coord.nome`,
      total: sql<number>`count(*)::int`,
      simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
      lideres: sql<number>`count(distinct ${contatosTable.lider_id})::int`,
    })
    .from(contatosTable)
    .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
    .groupBy(contatosTable.coordenador_id, sql`coord.nome`)
    .orderBy(sql`count(*) desc`);

  const porBairro = await db
    .select({
      bairro: contatosTable.bairro,
      total: sql<number>`count(*)::int`,
    })
    .from(contatosTable)
    .groupBy(contatosTable.bairro)
    .orderBy(sql`count(*) desc`);

  res.json({
    total_contatos: totals?.total_contatos || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    total_coordenadores: coordCount?.total || 0,
    total_lideres: liderCount?.total || 0,
    por_coordenador: porCoordenador,
    por_bairro: porBairro,
  });
});

router.get("/dashboard/coordenador", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (usuario.tipo !== "coordenador") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const [totals] = await db
    .select({
      total_base: sql<number>`count(*)::int`,
      total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    })
    .from(contatosTable)
    .where(eq(contatosTable.coordenador_id, usuario.id));

  const [liderCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(and(eq(usuariosTable.tipo, "lider"), eq(usuariosTable.coordenador_id, usuario.id)));

  const rankingLideres = await db
    .select({
      lider_id: contatosTable.lider_id,
      lider_nome: sql<string | null>`lider.nome`,
      total: sql<number>`count(*)::int`,
      simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    })
    .from(contatosTable)
    .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
    .where(eq(contatosTable.coordenador_id, usuario.id))
    .groupBy(contatosTable.lider_id, sql`lider.nome`)
    .orderBy(sql`count(*) desc`);

  res.json({
    total_base: totals?.total_base || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    total_lideres: liderCount?.total || 0,
    ranking_lideres: rankingLideres,
  });
});

router.get("/dashboard/lider", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (usuario.tipo !== "lider") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const [totals] = await db
    .select({
      total_contatos: sql<number>`count(*)::int`,
      total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    })
    .from(contatosTable)
    .where(eq(contatosTable.lider_id, usuario.id));

  const ultimosCadastrados = await db
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
      lider_nome: sql<string | null>`null`,
      coordenador_nome: sql<string | null>`null`,
    })
    .from(contatosTable)
    .where(eq(contatosTable.lider_id, usuario.id))
    .orderBy(sql`${contatosTable.created_at} desc`)
    .limit(5);

  res.json({
    total_contatos: totals?.total_contatos || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    ultimos_cadastrados: ultimosCadastrados,
  });
});

export default router;
