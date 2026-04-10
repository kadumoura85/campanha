import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { db, contatosTable, usuariosTable, regioesTable, eventosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

const getProximosEventos = async (usuarioId: number, tipo: string, coordenadorId: number | null) => {
  const today = new Date().toISOString().split("T")[0];

  if (tipo === "lider") {
    return db.select({
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
    .where(sql`${eventosTable.data} >= ${today} and (${eventosTable.visibilidade} = 'geral' or ${eventosTable.lider_id} = ${usuarioId})`)
    .orderBy(eventosTable.data)
    .limit(5);
  }

  if (tipo === "coordenador_regional") {
    return db.select({
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
    .where(sql`${eventosTable.data} >= ${today} and (${eventosTable.visibilidade} = 'geral' or ${eventosTable.coordenador_regional_id} = ${usuarioId})`)
    .orderBy(eventosTable.data)
    .limit(5);
  }

  return db.select({
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
  .where(sql`${eventosTable.data} >= ${today}`)
  .orderBy(eventosTable.data)
  .limit(5);
};

router.get("/dashboard/vereador", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!["vereador", "coordenador_geral", "super_admin"].includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const [totals] = await db.select({
    total_contatos: sql<number>`count(*)::int`,
    total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable);

  const umaSemanaAtras = new Date();
  umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
  const [semanaAntPass] = await db.select({ total: sql<number>`count(*)::int` })
    .from(contatosTable).where(gte(contatosTable.created_at, umaSemanaAtras));

  const [coordCount] = await db.select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable).where(eq(usuariosTable.tipo, "coordenador_regional"));

  const [liderCount] = await db.select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable).where(eq(usuariosTable.tipo, "lider"));

  const [regiaoCount] = await db.select({ total: sql<number>`count(*)::int` }).from(regioesTable);

  const porCoordenador = await db.select({
    coordenador_id: contatosTable.coordenador_id,
    coordenador_nome: sql<string | null>`coord.nome`,
    regiao_nome: sql<string | null>`min(r.nome)`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    lideres: sql<number>`count(distinct ${contatosTable.lider_id})::int`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
  .leftJoin(sql`regioes r`, sql`r.id = coord.regiao_id`)
  .groupBy(contatosTable.coordenador_id, sql`coord.nome`)
  .orderBy(sql`count(*) desc`);

  const porRegiao = await db.select({
    regiao_id: regioesTable.id,
    regiao_nome: regioesTable.nome,
    cor: regioesTable.cor,
    prioridade: regioesTable.prioridade,
    total: sql<number>`count(distinct c.id)::int`,
    simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
    fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
    lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
  })
  .from(regioesTable)
  .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
  .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`)
  .groupBy(regioesTable.id)
  .orderBy(sql`count(distinct c.id) desc`);

  const rankingLideres = await db.select({
    lider_id: contatosTable.lider_id,
    lider_nome: sql<string | null>`lider.nome`,
    coordenador_nome: sql<string | null>`coord.nome`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
  .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
  .groupBy(contatosTable.lider_id, sql`lider.nome`, sql`coord.nome`)
  .orderBy(sql`count(*) desc`)
  .limit(10);

  const proximos_eventos = await getProximosEventos(usuario.id, usuario.tipo, null);

  const evolucao_semanal = await db.select({
    semana: sql<string>`date_trunc('week', ${contatosTable.created_at})::date::text`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable)
    .where(gte(contatosTable.created_at, new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`date_trunc('week', ${contatosTable.created_at})`)
    .orderBy(sql`date_trunc('week', ${contatosTable.created_at})`);

  const alertas: string[] = [];
  const regioesFracas = porRegiao.filter(r => r.total > 0 && r.fechados / r.total < 0.1);
  if (regioesFracas.length > 0) alertas.push(`${regioesFracas.length} região(ões) com poucos fechados`);
  const regioesPrioritarias = porRegiao.filter(r => r.prioridade === "prioritaria");
  if (regioesPrioritarias.length > 0) alertas.push(`${regioesPrioritarias.length} região(ões) prioritária(s) ativa(s)`);
  if (proximos_eventos.length > 0) alertas.push(`${proximos_eventos.length} evento(s) próximo(s)`);

  res.json({
    total_contatos: totals?.total_contatos || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    total_coordenadores: coordCount?.total || 0,
    total_lideres: liderCount?.total || 0,
    total_regioes: regiaoCount?.total || 0,
    crescimento_semana: semanaAntPass?.total || 0,
    evolucao_semanal,
    por_coordenador: porCoordenador,
    por_regiao: porRegiao,
    ranking_lideres: rankingLideres,
    proximos_eventos,
    alertas,
  });
});

router.get("/dashboard/coordenador-geral", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!["coordenador_geral", "super_admin"].includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const [totals] = await db.select({
    total_contatos: sql<number>`count(*)::int`,
    total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable);

  const umaSemanaAtras = new Date();
  umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
  const [semanaAntPass] = await db.select({ total: sql<number>`count(*)::int` })
    .from(contatosTable).where(gte(contatosTable.created_at, umaSemanaAtras));

  const [coordCount] = await db.select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable).where(eq(usuariosTable.tipo, "coordenador_regional"));

  const [liderCount] = await db.select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable).where(eq(usuariosTable.tipo, "lider"));

  const [regiaoCount] = await db.select({ total: sql<number>`count(*)::int` }).from(regioesTable);

  const porCoordenador = await db.select({
    coordenador_id: contatosTable.coordenador_id,
    coordenador_nome: sql<string | null>`coord.nome`,
    regiao_nome: sql<string | null>`min(r.nome)`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    lideres: sql<number>`count(distinct ${contatosTable.lider_id})::int`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
  .leftJoin(sql`regioes r`, sql`r.id = coord.regiao_id`)
  .groupBy(contatosTable.coordenador_id, sql`coord.nome`)
  .orderBy(sql`count(*) desc`);

  const porRegiao = await db.select({
    regiao_id: regioesTable.id,
    regiao_nome: regioesTable.nome,
    cor: regioesTable.cor,
    prioridade: regioesTable.prioridade,
    total: sql<number>`count(distinct c.id)::int`,
    simpatizantes: sql<number>`count(distinct c.id) filter (where c.nivel = 'simpatizante')::int`,
    fechados: sql<number>`count(distinct c.id) filter (where c.nivel = 'fechado')::int`,
    lideres: sql<number>`count(distinct u.id) filter (where u.tipo = 'lider')::int`,
  })
  .from(regioesTable)
  .leftJoin(sql`contatos c`, sql`c.regiao_id = ${regioesTable.id}`)
  .leftJoin(sql`usuarios u`, sql`u.regiao_id = ${regioesTable.id}`)
  .groupBy(regioesTable.id)
  .orderBy(sql`count(distinct c.id) desc`);

  const rankingLideres = await db.select({
    lider_id: contatosTable.lider_id,
    lider_nome: sql<string | null>`lider.nome`,
    coordenador_nome: sql<string | null>`coord.nome`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
  .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
  .groupBy(contatosTable.lider_id, sql`lider.nome`, sql`coord.nome`)
  .orderBy(sql`count(*) desc`)
  .limit(10);

  const proximos_eventos = await getProximosEventos(usuario.id, usuario.tipo, null);

  const evolucao_semanal = await db.select({
    semana: sql<string>`date_trunc('week', ${contatosTable.created_at})::date::text`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable)
    .where(gte(contatosTable.created_at, new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`date_trunc('week', ${contatosTable.created_at})`)
    .orderBy(sql`date_trunc('week', ${contatosTable.created_at})`);

  const alertas: string[] = [];
  const regioesFracas = porRegiao.filter(r => r.total > 0 && r.fechados / r.total < 0.1);
  if (regioesFracas.length > 0) alertas.push(`${regioesFracas.length} região(ões) com poucos fechados`);
  const regioesPrioritarias = porRegiao.filter(r => r.prioridade === "prioritaria");
  if (regioesPrioritarias.length > 0) alertas.push(`${regioesPrioritarias.length} região(ões) prioritária(s) ativa(s)`);
  if (proximos_eventos.length > 0) alertas.push(`${proximos_eventos.length} evento(s) próximo(s)`);

  res.json({
    total_contatos: totals?.total_contatos || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    total_coordenadores: coordCount?.total || 0,
    total_lideres: liderCount?.total || 0,
    total_regioes: regiaoCount?.total || 0,
    crescimento_semana: semanaAntPass?.total || 0,
    evolucao_semanal,
    por_coordenador: porCoordenador,
    por_regiao: porRegiao,
    ranking_lideres: rankingLideres,
    proximos_eventos,
    alertas,
  });
});

router.get("/dashboard/coordenador-regional", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (usuario.tipo !== "coordenador_regional") {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const [totals] = await db.select({
    total_base: sql<number>`count(*)::int`,
    total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable).where(eq(contatosTable.coordenador_id, usuario.id));

  const [liderCount] = await db.select({ total: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(and(eq(usuariosTable.tipo, "lider"), eq(usuariosTable.coordenador_id, usuario.id)));

  const rankingLideres = await db.select({
    lider_id: contatosTable.lider_id,
    lider_nome: sql<string | null>`lider.nome`,
    coordenador_nome: sql<string | null>`coord.nome`,
    total: sql<number>`count(*)::int`,
    simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
  .leftJoin(sql`usuarios coord`, sql`coord.id = ${contatosTable.coordenador_id}`)
  .where(eq(contatosTable.coordenador_id, usuario.id))
  .groupBy(contatosTable.lider_id, sql`lider.nome`, sql`coord.nome`)
  .orderBy(sql`count(*) desc`);

  let regiao_nome: string | null = null;
  let regiao_prioridade: string | null = null;
  if (usuario.regiao_id) {
    const [reg] = await db.select({ nome: regioesTable.nome, prioridade: regioesTable.prioridade })
      .from(regioesTable).where(eq(regioesTable.id, usuario.regiao_id));
    regiao_nome = reg?.nome || null;
    regiao_prioridade = reg?.prioridade || null;
  }

  const ultimas_movimentacoes = await db.select({
    id: contatosTable.id,
    nome: contatosTable.nome,
    telefone: contatosTable.telefone,
    bairro: contatosTable.bairro,
    rua_referencia: contatosTable.rua_referencia,
    nivel: contatosTable.nivel,
    observacao: contatosTable.observacao,
    lider_id: contatosTable.lider_id,
    coordenador_id: contatosTable.coordenador_id,
    regiao_id: contatosTable.regiao_id,
    created_at: contatosTable.created_at,
    updated_at: contatosTable.updated_at,
    lider_nome: sql<string | null>`lider.nome`,
    coordenador_nome: sql<string | null>`null`,
    regiao_nome: sql<string | null>`null`,
  })
  .from(contatosTable)
  .leftJoin(sql`usuarios lider`, sql`lider.id = ${contatosTable.lider_id}`)
  .where(eq(contatosTable.coordenador_id, usuario.id))
  .orderBy(sql`${contatosTable.updated_at} desc`)
  .limit(5);

  const proximos_eventos = await getProximosEventos(usuario.id, usuario.tipo, null);

  res.json({
    total_base: totals?.total_base || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    total_lideres: liderCount?.total || 0,
    regiao_id: usuario.regiao_id || null,
    regiao_nome,
    regiao_prioridade,
    ranking_lideres: rankingLideres,
    proximos_eventos,
    ultimas_movimentacoes,
  });
});

router.get("/dashboard/lider", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (usuario.tipo !== "lider") {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const [totals] = await db.select({
    total_contatos: sql<number>`count(*)::int`,
    total_simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
    total_fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
  }).from(contatosTable).where(eq(contatosTable.lider_id, usuario.id));

  let regiao_nome: string | null = null;
  if (usuario.regiao_id) {
    const [reg] = await db.select({ nome: regioesTable.nome })
      .from(regioesTable).where(eq(regioesTable.id, usuario.regiao_id));
    regiao_nome = reg?.nome || null;
  }

  const ultimosCadastrados = await db.select({
    id: contatosTable.id,
    nome: contatosTable.nome,
    telefone: contatosTable.telefone,
    bairro: contatosTable.bairro,
    rua_referencia: contatosTable.rua_referencia,
    nivel: contatosTable.nivel,
    observacao: contatosTable.observacao,
    lider_id: contatosTable.lider_id,
    coordenador_id: contatosTable.coordenador_id,
    regiao_id: contatosTable.regiao_id,
    created_at: contatosTable.created_at,
    updated_at: contatosTable.updated_at,
    lider_nome: sql<string | null>`null`,
    coordenador_nome: sql<string | null>`null`,
    regiao_nome: sql<string | null>`null`,
  })
  .from(contatosTable)
  .where(eq(contatosTable.lider_id, usuario.id))
  .orderBy(sql`${contatosTable.created_at} desc`)
  .limit(5);

  const proximos_eventos = await getProximosEventos(usuario.id, usuario.tipo, null);

  res.json({
    total_contatos: totals?.total_contatos || 0,
    total_simpatizantes: totals?.total_simpatizantes || 0,
    total_fechados: totals?.total_fechados || 0,
    regiao_nome,
    ultimos_cadastrados: ultimosCadastrados,
    proximos_eventos,
  });
});

router.get("/evolucao-semanal", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const semanas = [];
  for (let i = 5; i >= 0; i--) {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - (i + 1) * 7);
    const fim = new Date();
    fim.setDate(fim.getDate() - i * 7);

    const label = `Sem ${6 - i}`;
    const [data] = await db.select({
      contatos: sql<number>`count(*)::int`,
      simpatizantes: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'simpatizante')::int`,
      fechados: sql<number>`count(*) filter (where ${contatosTable.nivel} = 'fechado')::int`,
    }).from(contatosTable).where(and(gte(contatosTable.created_at, inicio), lt(contatosTable.created_at, fim)));

    semanas.push({ semana: label, contatos: data?.contatos || 0, simpatizantes: data?.simpatizantes || 0, fechados: data?.fechados || 0 });
  }

  res.json(semanas);
});

export default router;
