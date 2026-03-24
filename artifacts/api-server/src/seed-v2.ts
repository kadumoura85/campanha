import { db, usuariosTable, contatosTable, regioesTable, eventosTable, configuracaoCampanhaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding v2 data...");

  await db.execute(`UPDATE usuarios SET tipo = 'coordenador_regional' WHERE tipo = 'coordenador'`);

  const [existingAdmin] = await db.select().from(usuariosTable).where(eq(usuariosTable.telefone, "11999990000"));
  if (!existingAdmin) {
    const hash = await bcrypt.hash("123456", 10);
    await db.insert(usuariosTable).values({ nome: "Super Admin", telefone: "11999990000", email: "admin@campanha.com", senha_hash: hash, tipo: "super_admin", ativo: true });
    console.log("super_admin created");
  }

  const [existingCoordGeral] = await db.select().from(usuariosTable).where(eq(usuariosTable.telefone, "11999990003"));
  if (!existingCoordGeral) {
    const hash = await bcrypt.hash("123456", 10);
    await db.insert(usuariosTable).values({ nome: "Ana Coordenadora Geral", telefone: "11999990003", email: "coordgeral@campanha.com", senha_hash: hash, tipo: "coordenador_geral", ativo: true });
    console.log("coordenador_geral created");
  }

  const existingRegioes = await db.select().from(regioesTable);
  let regiao1Id: number, regiao2Id: number, regiao3Id: number;

  if (existingRegioes.length === 0) {
    const coordenadores = await db.select().from(usuariosTable).where(eq(usuariosTable.tipo, "coordenador_regional"));
    const coord1Id = coordenadores[0]?.id || null;
    const coord2Id = coordenadores[1]?.id || null;

    const [r1] = await db.insert(regioesTable).values({ nome: "Região Norte", descricao: "Bairros do norte da cidade", coordenador_regional_id: coord1Id, cor: "#3B82F6", prioridade: "prioritaria", observacao_estrategica: "Grande potencial. Foco em fechamento." }).returning();
    const [r2] = await db.insert(regioesTable).values({ nome: "Região Sul", descricao: "Bairros do sul da cidade", coordenador_regional_id: coord2Id, cor: "#10B981", prioridade: "normal", observacao_estrategica: "Base sólida. Manter contato regular." }).returning();
    const [r3] = await db.insert(regioesTable).values({ nome: "Centro", descricao: "Região central", coordenador_regional_id: null, cor: "#F59E0B", prioridade: "atencao", observacao_estrategica: "Concorrência forte. Atenção especial." }).returning();

    regiao1Id = r1!.id; regiao2Id = r2!.id; regiao3Id = r3!.id;
    console.log("Regioes created:", regiao1Id, regiao2Id, regiao3Id);

    if (coord1Id) await db.update(usuariosTable).set({ regiao_id: regiao1Id }).where(eq(usuariosTable.id, coord1Id));
    if (coord2Id) await db.update(usuariosTable).set({ regiao_id: regiao2Id }).where(eq(usuariosTable.id, coord2Id));

    const lideres = await db.select().from(usuariosTable).where(eq(usuariosTable.tipo, "lider"));
    for (let i = 0; i < lideres.length; i++) {
      await db.update(usuariosTable).set({ regiao_id: i % 2 === 0 ? regiao1Id : regiao2Id }).where(eq(usuariosTable.id, lideres[i]!.id));
    }

    const contatos = await db.select().from(contatosTable);
    for (let i = 0; i < contatos.length; i++) {
      await db.update(contatosTable).set({ regiao_id: i % 2 === 0 ? regiao1Id : regiao2Id }).where(eq(contatosTable.id, contatos[i]!.id));
    }
  } else {
    regiao1Id = existingRegioes[0]!.id;
    regiao2Id = existingRegioes[1]?.id || existingRegioes[0]!.id;
    regiao3Id = existingRegioes[2]?.id || existingRegioes[0]!.id;
  }

  const [existingConfig] = await db.select().from(configuracaoCampanhaTable).limit(1);
  if (!existingConfig) {
    await db.insert(configuracaoCampanhaTable).values({ nome_candidato: "Dr. Carlos Mendes", slogan: "Juntos por uma cidade melhor!", numero: "11", cor_primaria: "#1d4ed8", cor_secundaria: "#1e40af", frase_institucional: "Trabalho, honestidade e compromisso com o povo." });
    console.log("Configuracao created");
  }

  const existingEventos = await db.select().from(eventosTable);
  if (existingEventos.length === 0) {
    const hoje = new Date();
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    const semanaQue = new Date(hoje); semanaQue.setDate(hoje.getDate() + 7);
    const semanaQue2 = new Date(hoje); semanaQue2.setDate(hoje.getDate() + 14);

    await db.insert(eventosTable).values([
      { titulo: "Reunião Geral da Campanha", descricao: "Alinhamento de estratégia com toda a equipe", data: amanha.toISOString().split("T")[0]!, hora: "19:00", local: "Salão Paroquial - Centro", tipo_evento: "reuniao", regiao_id: null, criado_por: 1, visibilidade: "geral" },
      { titulo: "Caminhada Região Norte", descricao: "Caminhada com o candidato pelos bairros do norte", data: semanaQue.toISOString().split("T")[0]!, hora: "08:00", local: "Praça Central Norte", tipo_evento: "caminhada", regiao_id: regiao1Id, criado_por: 1, visibilidade: "regional" },
      { titulo: "Comício de Abertura", descricao: "Comício oficial de abertura da campanha", data: semanaQue2.toISOString().split("T")[0]!, hora: "18:00", local: "Praça da Prefeitura", tipo_evento: "comicio", regiao_id: null, criado_por: 1, visibilidade: "geral" },
    ]);
    console.log("Eventos created");
  }

  console.log("Seed v2 complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
