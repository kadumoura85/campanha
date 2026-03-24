import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "campanha_secret_key_2024";

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch {
    return null;
  }
}

export async function getUsuarioFromRequest(req: any): Promise<typeof usuariosTable.$inferSelect | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, decoded.userId));

  return usuario || null;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, senha } = parsed.data;

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.email, email));

  if (!usuario) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  if (!usuario.ativo) {
    res.status(401).json({ error: "Usuário inativo" });
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
  const usuario = await getUsuarioFromRequest(req);
  if (!usuario) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const { senha_hash: _, ...usuarioSemSenha } = usuario;
  res.json(usuarioSemSenha);
});

export default router;
