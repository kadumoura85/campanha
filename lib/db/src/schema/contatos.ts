import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contatosTable = pgTable("contatos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().unique(),
  bairro: text("bairro"),
  rua_referencia: text("rua_referencia"),
  nivel: text("nivel").notNull().$type<"contato" | "simpatizante" | "fechado">(),
  observacao: text("observacao"),
  lider_id: integer("lider_id"),
  coordenador_id: integer("coordenador_id"),
  regiao_id: integer("regiao_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContatoSchema = createInsertSchema(contatosTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertContato = z.infer<typeof insertContatoSchema>;
export type Contato = typeof contatosTable.$inferSelect;
