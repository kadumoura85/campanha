import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regioesTable = pgTable("regioes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  coordenador_regional_id: integer("coordenador_regional_id"),
  cor: text("cor").notNull().default("#3B82F6"),
  prioridade: text("prioridade").notNull().default("normal").$type<"normal" | "atencao" | "prioritaria">(),
  observacao_estrategica: text("observacao_estrategica"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRegiaoSchema = createInsertSchema(regioesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertRegiao = z.infer<typeof insertRegiaoSchema>;
export type Regiao = typeof regioesTable.$inferSelect;
