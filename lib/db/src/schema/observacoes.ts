import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const observacoesRegiaoTable = pgTable("observacoes_regiao", {
  id: serial("id").primaryKey(),
  regiao_id: integer("regiao_id").notNull(),
  autor_id: integer("autor_id").notNull(),
  observacao: text("observacao").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertObservacaoSchema = createInsertSchema(observacoesRegiaoTable).omit({ id: true, created_at: true });
export type InsertObservacao = z.infer<typeof insertObservacaoSchema>;
export type ObservacaoRegiao = typeof observacoesRegiaoTable.$inferSelect;
