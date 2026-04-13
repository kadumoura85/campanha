import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { CreateEventoBody, UpdateEventoBody } from "@workspace/api-zod";
import { db, eventosTable, usuariosTable } from "@workspace/db";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

type TipoEvento =
  | "reuniao"
  | "caminhada"
  | "visita"
  | "comicio"
  | "acao_de_rua"
  | "evento_interno";

type VisibilidadeEvento = "geral" | "regional" | "lider";

const EVENT_TYPES: readonly TipoEvento[] = [
  "reuniao",
  "caminhada",
  "visita",
  "comicio",
  "acao_de_rua",
  "evento_interno",
];

const EVENT_VISIBILITIES: readonly VisibilidadeEvento[] = ["geral", "regional", "lider"];

const EVENT_MANAGER_TYPES = [
  "super_admin",
  "vereador",
  "coordenador_geral",
  "coordenador_regional",
];

async function getEventoById(id: number) {
  const [evento] = await db.select().from(eventosTable).where(eq(eventosTable.id, id));
  return evento || null;
}

async function resolveEventoScope(
  usuario: Awaited<ReturnType<typeof getUsuarioFromRequest>>,
  input: {
    regiao_id?: number | null;
    visibilidade?: string | null;
    coordenador_regional_id?: number | null;
    lider_id?: number | null;
  },
  res: any,
) {
  if (!usuario) return null;

  if (!EVENT_MANAGER_TYPES.includes(usuario.tipo)) {
    res.status(403).json({ error: "Perfil sem permissao para gerenciar eventos" });
    return null;
  }

  const scope = {
    regiao_id: input.regiao_id ?? null,
    visibilidade: (input.visibilidade ?? "geral") as VisibilidadeEvento,
    coordenador_regional_id: input.coordenador_regional_id ?? null,
    lider_id: input.lider_id ?? null,
  };

  if (!EVENT_VISIBILITIES.includes(scope.visibilidade)) {
    res.status(400).json({ error: "Visibilidade de evento invalida" });
    return null;
  }

  if (usuario.tipo === "coordenador_regional") {
    if (!usuario.regiao_id) {
      res.status(400).json({ error: "Seu usuario precisa estar vinculado a uma regiao para gerenciar eventos" });
      return null;
    }

    if (scope.regiao_id && scope.regiao_id !== usuario.regiao_id) {
      res.status(403).json({ error: "Voce so pode usar a sua propria regiao nos eventos" });
      return null;
    }

    scope.regiao_id = usuario.regiao_id;
    scope.coordenador_regional_id = usuario.id;

    if (scope.lider_id) {
      const [lider] = await db
        .select({
          id: usuariosTable.id,
          tipo: usuariosTable.tipo,
          coordenador_id: usuariosTable.coordenador_id,
          ativo: usuariosTable.ativo,
        })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, scope.lider_id));

      if (!lider || lider.tipo !== "lider" || !lider.ativo || lider.coordenador_id !== usuario.id) {
        res.status(400).json({ error: "Selecione um lider ativo da sua propria equipe" });
        return null;
      }
    }
  }

  if (scope.visibilidade === "lider" && !scope.lider_id) {
    res.status(400).json({ error: "Evento com visibilidade de lider precisa estar vinculado a um lider" });
    return null;
  }

  if (scope.visibilidade === "regional" && !scope.coordenador_regional_id) {
    if (usuario.tipo === "coordenador_regional") {
      scope.coordenador_regional_id = usuario.id;
    } else {
      res.status(400).json({ error: "Evento regional precisa estar vinculado a um coordenador regional" });
      return null;
    }
  }

  if (scope.visibilidade === "geral") {
    scope.lider_id = null;
  }

  return scope;
}

router.get("/eventos", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

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
  if (tipo_evento) {
    if (!EVENT_TYPES.includes(tipo_evento as TipoEvento)) {
      res.status(400).json({ error: "Tipo de evento invalido" });
      return;
    }
    conditions.push(eq(eventosTable.tipo_evento, tipo_evento as TipoEvento));
  }

  if (usuario.tipo === "lider") {
    conditions.push(
      sql`(${eventosTable.visibilidade} = 'geral' or ${eventosTable.lider_id} = ${usuario.id} or (${eventosTable.visibilidade} = 'regional' and ${eventosTable.coordenador_regional_id} = ${usuario.coordenador_id}))`,
    );
  } else if (usuario.tipo === "coordenador_regional") {
    conditions.push(
      sql`(${eventosTable.visibilidade} = 'geral' or ${eventosTable.coordenador_regional_id} = ${usuario.id} or ${eventosTable.criado_por} = ${usuario.id})`,
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
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const parsed = CreateEventoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scope = await resolveEventoScope(usuario, parsed.data, res);
  if (!scope) return;

  const { titulo, descricao, data, hora, local, tipo_evento } = parsed.data;

  const [evento] = await db
    .insert(eventosTable)
    .values({
      titulo,
      descricao: descricao || null,
      data,
      hora: hora || null,
      local: local || null,
      tipo_evento,
      regiao_id: scope.regiao_id,
      criado_por: usuario.id,
      visibilidade: scope.visibilidade,
      coordenador_regional_id: scope.coordenador_regional_id,
      lider_id: scope.lider_id,
    })
    .returning();

  res.status(201).json({ ...evento, criado_por_nome: usuario.nome, regiao_nome: null });
});

router.patch("/eventos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const id = Number(req.params["id"]);
  const existing = await getEventoById(id);
  if (!existing) {
    res.status(404).json({ error: "Evento nao encontrado" });
    return;
  }

  if (usuario.tipo === "coordenador_regional" && existing.criado_por !== usuario.id) {
    res.status(403).json({ error: "Voce so pode editar eventos criados por voce" });
    return;
  }

  if (!EVENT_MANAGER_TYPES.includes(usuario.tipo)) {
    res.status(403).json({ error: "Perfil sem permissao para editar eventos" });
    return;
  }

  const parsed = UpdateEventoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scope = await resolveEventoScope(
    usuario,
    {
      regiao_id: parsed.data.regiao_id ?? existing.regiao_id,
      visibilidade: parsed.data.visibilidade ?? existing.visibilidade,
      coordenador_regional_id: existing.coordenador_regional_id,
      lider_id: existing.lider_id,
    },
    res,
  );
  if (!scope) return;

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  updates.regiao_id = scope.regiao_id;
  updates.visibilidade = scope.visibilidade;
  updates.coordenador_regional_id = scope.coordenador_regional_id;
  updates.lider_id = scope.lider_id;

  const [updated] = await db
    .update(eventosTable)
    .set(updates)
    .where(eq(eventosTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Evento nao encontrado" });
    return;
  }

  res.json(updated);
});

router.delete("/eventos/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  const id = Number(req.params["id"]);
  const existing = await getEventoById(id);
  if (!existing) {
    res.status(404).json({ error: "Evento nao encontrado" });
    return;
  }

  if (usuario.tipo === "coordenador_regional" && existing.criado_por !== usuario.id) {
    res.status(403).json({ error: "Voce so pode excluir eventos criados por voce" });
    return;
  }

  if (!EVENT_MANAGER_TYPES.includes(usuario.tipo)) {
    res.status(403).json({ error: "Perfil sem permissao para excluir eventos" });
    return;
  }

  const [deleted] = await db
    .delete(eventosTable)
    .where(eq(eventosTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Evento nao encontrado" });
    return;
  }

  res.status(204).send();
});

export default router;
