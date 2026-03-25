import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import { CreateUsuarioBody, UpdateUsuarioBody } from "@workspace/api-zod";
import { getUsuarioFromRequest } from "./auth";

const router: IRouter = Router();

const ADMIN_TYPES = ["super_admin", "vereador", "coordenador_geral"];

router.get("/usuarios", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  if (!ADMIN_TYPES.includes(usuario.tipo)) {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const { tipo, coordenador_id } = req.query;
  const conditions: any[] = [];

  if (tipo) conditions.push(eq(usuariosTable.tipo, tipo as string));
  if (coordenador_id) conditions.push(eq(usuariosTable.coordenador_id, parseInt(coordenador_id as string, 10)));

  const query = db.select({
    id: usuariosTable.id,
    nome: usuariosTable.nome,
    telefone: usuariosTable.telefone,
    email: usuariosTable.email,
    tipo: usuariosTable.tipo,
    coordenador_id: usuariosTable.coordenador_id,
    bairro_regiao: usuariosTable.bairro_regiao,
    ativo: usuariosTable.ativo,
    created_at: usuariosTable.created_at,
  }).from(usuariosTable);

  const usuarios = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  res.json(usuarios);
});

router.post("/usuarios", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const canCreate = ADMIN_TYPES.includes(usuario.tipo);
  if (!canCreate) { res.status(403).json({ error: "Acesso negado" }); return; }

  const parsed = CreateUsuarioBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const targetTipo = parsed.data.tipo;

  if (usuario.tipo === "coordenador_regional") {
    if (targetTipo !== "lider") {
      res.status(403).json({ error: "Coordenador só pode cadastrar líderes" }); return;
    }
  } else if (usuario.tipo === "coordenador_geral") {
    if (!["coordenador_regional", "lider"].includes(targetTipo)) {
      res.status(403).json({ error: "Coordenador Geral pode cadastrar coordenadores e líderes" }); return;
    }
  } else if (usuario.tipo === "vereador") {
    if (targetTipo === "super_admin") {
      res.status(403).json({ error: "Não autorizado a criar super_admin" }); return;
    }
  }

  const { senha, ...rest } = parsed.data;
  const senha_hash = await bcrypt.hash(senha, 10);

  let values: any = { ...rest, senha_hash };
  if (usuario.tipo === "coordenador_regional" && targetTipo === "lider") {
    values.coordenador_id = usuario.id;
  }

  const [novoUsuario] = await db
    .insert(usuariosTable)
    .values(values)
    .returning({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      telefone: usuariosTable.telefone,
      email: usuariosTable.email,
      tipo: usuariosTable.tipo,
      coordenador_id: usuariosTable.coordenador_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    });

  res.status(201).json(novoUsuario);
});

router.get("/usuarios/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [found] = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      telefone: usuariosTable.telefone,
      email: usuariosTable.email,
      tipo: usuariosTable.tipo,
      coordenador_id: usuariosTable.coordenador_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, id));

  if (!found) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json(found);
});

router.patch("/usuarios/:id", async (req, res): Promise<void> => {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) { res.status(401).json({ error: "Não autenticado" }); return; }

  const canEdit = ADMIN_TYPES.includes(usuario.tipo);
  if (!canEdit) { res.status(403).json({ error: "Acesso negado" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [target] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id));
  if (!target) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  if (usuario.tipo === "coordenador_geral") {
    if (!["coordenador_regional", "lider"].includes(target.tipo)) {
      res.status(403).json({ error: "Coordenador Geral só pode editar coordenadores e líderes" }); return;
    }
  }

  const parsed = UpdateUsuarioBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) {
      updateData[key] = value;
    }
  }

  const [updated] = await db
    .update(usuariosTable)
    .set(updateData)
    .where(eq(usuariosTable.id, id))
    .returning({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      telefone: usuariosTable.telefone,
      email: usuariosTable.email,
      tipo: usuariosTable.tipo,
      coordenador_id: usuariosTable.coordenador_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    });

  if (!updated) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json(updated);
});

export default router;
