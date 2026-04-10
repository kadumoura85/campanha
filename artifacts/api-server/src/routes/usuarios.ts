import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { asc, eq, and } from "drizzle-orm";
import { db, contatosTable, usuariosTable } from "@workspace/db";
import { CreateUsuarioBody, UpdateUsuarioBody } from "@workspace/api-zod";
import { requireRoles } from "./auth";

const router: IRouter = Router();

const MANAGER_TYPES = [
  "super_admin",
  "vereador",
  "coordenador_geral",
  "coordenador_regional",
];
type TipoUsuario =
  | "super_admin"
  | "vereador"
  | "coordenador_geral"
  | "coordenador_regional"
  | "lider";

router.get("/usuarios", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, MANAGER_TYPES);
  if (!usuario) return;

  const { tipo, coordenador_id } = req.query;
  const conditions: any[] = [];

  if (usuario.tipo === "coordenador_regional") {
    conditions.push(eq(usuariosTable.tipo, "lider"));
    conditions.push(eq(usuariosTable.coordenador_id, usuario.id));
  }

  if (tipo) conditions.push(eq(usuariosTable.tipo, tipo as TipoUsuario));
  if (coordenador_id) {
    conditions.push(
      eq(usuariosTable.coordenador_id, parseInt(coordenador_id as string, 10)),
    );
  }

  const query = db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      telefone: usuariosTable.telefone,
      email: usuariosTable.email,
      tipo: usuariosTable.tipo,
      coordenador_id: usuariosTable.coordenador_id,
      regiao_id: usuariosTable.regiao_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    })
    .from(usuariosTable)
    .orderBy(asc(usuariosTable.nome), asc(usuariosTable.id));

  const usuarios =
    conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  res.json(usuarios);
});

router.post("/usuarios", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, MANAGER_TYPES);
  if (!usuario) return;

  const parsed = CreateUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const targetTipo = parsed.data.tipo;

  if (usuario.tipo === "coordenador_regional") {
    if (targetTipo !== "lider") {
      res.status(403).json({ error: "Coordenador so pode cadastrar lideres" });
      return;
    }
  } else if (usuario.tipo === "coordenador_geral") {
    if (!["coordenador_regional", "lider"].includes(targetTipo)) {
      res
        .status(403)
        .json({ error: "Coordenador Geral pode cadastrar coordenadores e lideres" });
      return;
    }
  } else if (usuario.tipo === "vereador") {
    if (targetTipo === "super_admin") {
      res.status(403).json({ error: "Nao autorizado a criar super_admin" });
      return;
    }
  }

  const { senha, ...rest } = parsed.data;
  const senha_hash = await bcrypt.hash(senha, 10);

  const values: any = { ...rest, senha_hash };

  if (targetTipo === "coordenador_regional" && !values.regiao_id) {
    res.status(400).json({ error: "Coordenador deve estar vinculado a uma regiao" });
    return;
  }

  if (targetTipo === "lider") {
    if (usuario.tipo === "coordenador_regional") {
      values.coordenador_id = usuario.id;
      values.regiao_id = usuario.regiao_id;
    } else {
      if (!values.coordenador_id) {
        res.status(400).json({ error: "Lider precisa estar vinculado a um coordenador" });
        return;
      }

      const [coordenador] = await db
        .select({
          id: usuariosTable.id,
          tipo: usuariosTable.tipo,
          regiao_id: usuariosTable.regiao_id,
        })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, values.coordenador_id));

      if (!coordenador || coordenador.tipo !== "coordenador_regional") {
        res.status(400).json({ error: "Selecione um coordenador valido para o lider" });
        return;
      }

      if (!coordenador.regiao_id) {
        res.status(400).json({ error: "O coordenador selecionado precisa estar vinculado a uma regiao" });
        return;
      }

      values.regiao_id = coordenador.regiao_id;
    }
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
      regiao_id: usuariosTable.regiao_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    });

  res.status(201).json(novoUsuario);
});

router.get("/usuarios/:id", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, MANAGER_TYPES);
  if (!usuario) return;

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
      regiao_id: usuariosTable.regiao_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, id));

  if (!found) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  if (
    usuario.tipo === "coordenador_regional" &&
    (found.tipo !== "lider" || found.coordenador_id !== usuario.id)
  ) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  res.json(found);
});

router.patch("/usuarios/:id", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, MANAGER_TYPES);
  if (!usuario) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [target] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, id));

  if (!target) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  if (
    usuario.tipo === "coordenador_regional" &&
    (target.tipo !== "lider" || target.coordenador_id !== usuario.id)
  ) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  if (usuario.tipo === "coordenador_geral") {
    if (!["coordenador_regional", "lider"].includes(target.tipo)) {
      res
        .status(403)
        .json({ error: "Coordenador Geral so pode editar coordenadores e lideres" });
      return;
    }
  }

  const parsed = UpdateUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

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
      regiao_id: usuariosTable.regiao_id,
      bairro_regiao: usuariosTable.bairro_regiao,
      ativo: usuariosTable.ativo,
      created_at: usuariosTable.created_at,
    });

  if (!updated) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  res.json(updated);
});

router.delete("/usuarios/:id", async (req, res): Promise<void> => {
  const usuario = await requireRoles(req, res, MANAGER_TYPES);
  if (!usuario) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (usuario.id === id) {
    res.status(400).json({ error: "Voce nao pode excluir o proprio usuario" });
    return;
  }

  const [target] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id));
  if (!target) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  if (
    usuario.tipo === "coordenador_regional" &&
    (target.tipo !== "lider" || target.coordenador_id !== usuario.id)
  ) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  if (usuario.tipo === "coordenador_geral" && !["coordenador_regional", "lider"].includes(target.tipo)) {
    res.status(403).json({ error: "Coordenador Geral so pode excluir coordenadores e lideres" });
    return;
  }

  if (usuario.tipo === "vereador" && target.tipo === "super_admin") {
    res.status(403).json({ error: "Nao autorizado a excluir super_admin" });
    return;
  }

  if (target.tipo === "coordenador_regional") {
    const lideres = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .where(and(eq(usuariosTable.tipo, "lider"), eq(usuariosTable.coordenador_id, target.id)));

    if (lideres.length > 0) {
      res.status(400).json({ error: "Exclua ou reatribua os lideres deste coordenador antes de continuar" });
      return;
    }

    await db.update(contatosTable).set({ coordenador_id: null }).where(eq(contatosTable.coordenador_id, target.id));
  }

  if (target.tipo === "lider") {
    await db.update(contatosTable).set({ lider_id: null }).where(eq(contatosTable.lider_id, target.id));
  }

  const [deleted] = await db
    .delete(usuariosTable)
    .where(eq(usuariosTable.id, id))
    .returning({ id: usuariosTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  res.status(204).send();
});

export default router;
