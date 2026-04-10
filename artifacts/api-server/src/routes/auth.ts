import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, pool, usuariosTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "campanha_secret_key_2024";
export type UsuarioAutenticado = typeof usuariosTable.$inferSelect;

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch {
    return null;
  }
}

export async function getUsuarioFromRequest(req: Request): Promise<UsuarioAutenticado | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const result = await pool.query(
    `select id, nome, telefone, email, senha_hash, tipo, coordenador_id, regiao_id, bairro_regiao, ativo, created_at
     from usuarios
     where id = $1
     limit 1`,
    [decoded.userId],
  );

  return (result.rows[0] as UsuarioAutenticado | undefined) || null;
}

export async function requireUsuario(req: Request, res: Response): Promise<UsuarioAutenticado | null> {
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Nao autenticado" });
    return null;
  }

  return usuario;
}

export function hasAnyRole(usuario: UsuarioAutenticado, roles: readonly string[]) {
  return roles.includes(usuario.tipo);
}

export async function requireRoles(
  req: Request,
  res: Response,
  roles: readonly string[],
): Promise<UsuarioAutenticado | null> {
  const usuario = await requireUsuario(req, res);
  if (!usuario) return null;

  if (!hasAnyRole(usuario, roles)) {
    res.status(403).json({ error: "Acesso negado" });
    return null;
  }

  return usuario;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { telefone, senha } = parsed.data;

  const result = await pool.query(
    `select id, nome, telefone, email, senha_hash, tipo, coordenador_id, regiao_id, bairro_regiao, ativo, created_at
     from usuarios
     where telefone = $1
     limit 1`,
    [telefone],
  );
  const usuario = result.rows[0] as UsuarioAutenticado | undefined;

  if (!usuario) {
    res.status(401).json({ error: "Telefone ou senha incorretos" });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    res.status(401).json({ error: "Telefone ou senha incorretos" });
    return;
  }

  if (!usuario.ativo) {
    res.status(401).json({ error: "Usuario inativo" });
    return;
  }

  const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: "7d" });

  const { senha_hash: _, ...usuarioSemSenha } = usuario;
  res.json({ usuario: usuarioSemSenha, token });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const usuario = await requireUsuario(req, res);
  if (!usuario) return;

  const { senha_hash: _, ...usuarioSemSenha } = usuario;
  res.json(usuarioSemSenha);
});

export default router;
