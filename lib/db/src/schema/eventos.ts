import { pgTable, text, serial, timestamp, integer, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventosTable = pgTable("eventos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  data: date("data").notNull(),
  hora: time("hora"),
  local: text("local"),
  tipo_evento: text("tipo_evento").notNull().default("reuniao").$type<"reuniao" | "caminhada" | "visita" | "comicio" | "acao_de_rua" | "evento_interno">(),
  regiao_id: integer("regiao_id"),
  criado_por: integer("criado_por").notNull(),
  visibilidade: text("visibilidade").notNull().default("geral").$type<"geral" | "regional" | "lider">(),
  coordenador_regional_id: integer("coordenador_regional_id"),
  lider_id: integer("lider_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventoSchema = createInsertSchema(eventosTable).omit({ id: true, created_at: true });
export type InsertEvento = z.infer<typeof insertEventoSchema>;
export type Evento = typeof eventosTable.$inferSelect;
