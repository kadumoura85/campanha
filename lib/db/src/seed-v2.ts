import { db, usuariosTable, contatosTable, regioesTable, eventosTable, configuracaoCampanhaTable } from "./index";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding v2 data...");

  // Update existing user tipos from old to new
  await db.execute(`
    UPDATE usuarios SET tipo = 'coordenador_regional' WHERE tipo = 'coordenador';
    UPDATE usuarios SET tipo = 'vereador' WHERE tipo = 'vereador';
  `);

  // Add super_admin and coordenador_geral if not exists
  const [existingAdmin] = await db.select().from(usuariosTable).where(eq(usuariosTable.telefone, "11999990000"));
  if (!existingAdmin) {
    const hash = await bcrypt.hash("123456", 10);
    await db.insert(usuariosTable).values({
      nome: "Super Admin",
      telefone: "11999990000",
      email: "admin@campanha.com",
      senha_hash: hash,
      tipo: "super_admin",
      ativo: true,
    });
    console.log("super_admin created");
  }

  const [existingCoordGeral] = await db.select().from(usuariosTable).where(eq(usuariosTable.telefone, "11999990003"));
  if (!existingCoordGeral) {
    const hash = await bcrypt.hash("123456", 10);
    await db.insert(usuariosTable).values({
      nome: "Ana Coordenadora Geral",
      telefone: "11999990003",
      email: "coordgeral@campanha.com",
      senha_hash: hash,
      tipo: "coordenador_geral",
      ativo: true,
    });
    console.log("coordenador_geral created");
  }

  // Create regioes
  const existingRegioes = await db.select().from(regioesTable);
  if (existingRegioes.length === 0) {
    // Find coordenador regional IDs
    const coordenadores = await db.select().from(usuariosTable).where(eq(usuariosTable.tipo, "coordenador_regional"));
    const coord1Id = coordenadores[0]?.id || null;
    const coord2Id = coordenadores[1]?.id || null;

    const [regiao1] = await db.insert(regioesTable).values({
      nome: "Região Norte",
      descricao: "Bairros do norte da cidade",
      coordenador_regional_id: coord1Id,
      cor: "#3B82F6",
      prioridade: "prioritaria",
      observacao_estrategica: "Região com grande potencial. Foco em fechamento de votos.",
    }).returning();

    const [regiao2] = await db.insert(regioesTable).values({
      nome: "Região Sul",
      descricao: "Bairros do sul da cidade",
      coordenador_regional_id: coord2Id,
      cor: "#10B981",
      prioridade: "normal",
      observacao_estrategica: "Base sólida. Manter contato regular com líderes.",
    }).returning();

    const [regiao3] = await db.insert(regioesTable).values({
      nome: "Centro",
      descricao: "Região central",
      coordenador_regional_id: null,
      cor: "#F59E0B",
      prioridade: "atencao",
      observacao_estrategica: "Concorrência forte nessa região. Requer atenção especial.",
    }).returning();

    console.log("Regioes created:", regiao1.id, regiao2.id, regiao3.id);

    // Update users with regiao_id
    if (coord1Id) {
      await db.update(usuariosTable).set({ regiao_id: regiao1.id }).where(eq(usuariosTable.id, coord1Id));
    }
    if (coord2Id) {
      await db.update(usuariosTable).set({ regiao_id: regiao2.id }).where(eq(usuariosTable.id, coord2Id));
    }

    // Update lideres with regiao
    const lideres = await db.select().from(usuariosTable).where(eq(usuariosTable.tipo, "lider"));
    for (let i = 0; i < lideres.length; i++) {
      const lid = lideres[i]!;
      const regiaoId = i % 2 === 0 ? regiao1.id : regiao2.id;
      await db.update(usuariosTable).set({ regiao_id: regiaoId }).where(eq(usuariosTable.id, lid.id));
    }

    // Update contatos with regiao
    const contatos = await db.select().from(contatosTable);
    for (let i = 0; i < contatos.length; i++) {
      const c = contatos[i]!;
      const regiaoId = i % 2 === 0 ? regiao1.id : regiao2.id;
      await db.update(contatosTable).set({ regiao_id: regiaoId }).where(eq(contatosTable.id, c.id));
    }
  }

  // Seed configuracao
  const [existingConfig] = await db.select().from(configuracaoCampanhaTable).limit(1);
  if (!existingConfig) {
    await db.insert(configuracaoCampanhaTable).values({
      nome_candidato: "Dr. Carlos Mendes",
      slogan: "Juntos por uma cidade melhor!",
      numero: "11",
      cor_primaria: "#1d4ed8",
      cor_secundaria: "#1e40af",
      frase_institucional: "Trabalho, honestidade e compromisso com o povo.",
    });
    console.log("Configuracao created");
  }

  // Seed eventos
  const existingEventos = await db.select().from(eventosTable);
  if (existingEventos.length === 0) {
    const [superAdmin] = await db.select().from(usuariosTable).where(eq(usuariosTable.tipo, "super_admin"));
    const criador = superAdmin?.id || 1;
    const regioes = await db.select().from(regioesTable);

    const hoje = new Date();
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    const semanaQue = new Date(hoje); semanaQue.setDate(hoje.getDate() + 7);
    const semanaQue2 = new Date(hoje); semanaQue2.setDate(hoje.getDate() + 14);

    await db.insert(eventosTable).values([
      {
        titulo: "Reunião Geral da Campanha",
        descricao: "Encontro com toda a equipe para alinhamento de estratégia",
        data: amanha.toISOString().split("T")[0]!,
        hora: "19:00",
        local: "Salão Paroquial - Centro",
        tipo_evento: "reuniao",
        regiao_id: null,
        criado_por: criador,
        visibilidade: "geral",
      },
      {
        titulo: "Caminhada Região Norte",
        descricao: "Caminhada pela região norte com o candidato",
        data: semanaQue.toISOString().split("T")[0]!,
        hora: "08:00",
        local: "Praça Central - Bairro Norte",
        tipo_evento: "caminhada",
        regiao_id: regioes[0]?.id || null,
        criado_por: criador,
        visibilidade: "regional",
        coordenador_regional_id: regioes[0]?.coordenador_regional_id || null,
      },
      {
        titulo: "Comício de Abertura",
        descricao: "Comício oficial de abertura da campanha",
        data: semanaQue2.toISOString().split("T")[0]!,
        hora: "18:00",
        local: "Praça da Prefeitura",
        tipo_evento: "comicio",
        regiao_id: null,
        criado_por: criador,
        visibilidade: "geral",
      },
    ]);
    console.log("Eventos created");
  }

  console.log("Seed v2 complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
