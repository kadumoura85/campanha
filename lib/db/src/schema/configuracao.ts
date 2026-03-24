import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const configuracaoCampanhaTable = pgTable("configuracao_campanha", {
  id: serial("id").primaryKey(),
  nome_candidato: text("nome_candidato").notNull().default(""),
  foto_principal: text("foto_principal"),
  slogan: text("slogan"),
  numero: text("numero"),
  cor_primaria: text("cor_primaria").notNull().default("#1d4ed8"),
  cor_secundaria: text("cor_secundaria").notNull().default("#1e40af"),
  logo: text("logo"),
  santinho_imagem: text("santinho_imagem"),
  capa_imagem: text("capa_imagem"),
  frase_institucional: text("frase_institucional"),
  musica_url: text("musica_url"),
  descricao_curta: text("descricao_curta"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConfiguracaoSchema = createInsertSchema(configuracaoCampanhaTable).omit({ id: true, updated_at: true });
export type InsertConfiguracao = z.infer<typeof insertConfiguracaoSchema>;
export type Configuracao = typeof configuracaoCampanhaTable.$inferSelect;
