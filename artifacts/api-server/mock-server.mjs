import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

// Mock data
const DEMO_USUARIO = {
  id: 1,
  nome: "Vereador Demo",
  telefone: "11999990001",
  email: "vereador@example.com",
  tipo: "vereador",
  ativo: true,
  created_at: new Date().toISOString(),
};

const DEMO_CONFIG = {
  id: 1,
  nome_candidato: "João Silva",
  cor_primaria: "#1d4ed8",
  cor_secundaria: "#1e40af",
  logo: "/opengraph.jpg",
  foto_principal: "/opengraph.jpg",
  descricao: "Sua campanha",
  created_at: new Date().toISOString(),
};

const DEMO_PESSOAS = [
  {
    id: 1,
    nome: "Maria Santos",
    telefone: "11999991001",
    email: "maria@example.com",
    endereco: "Rua A, 123",
    bairro: "Centro",
    intencao_voto: "sim",
    criado_em: new Date().toISOString(),
  },
  {
    id: 2,
    nome: "José oliveira",
    telefone: "11999991002",
    email: "jose@example.com",
    endereco: "Avenida B, 456",
    bairro: "Zona Norte",
    intencao_voto: "indeciso",
    criado_em: new Date().toISOString(),
  },
];

// Auth routes
app.post("/api/auth/login", (req, res) => {
  const { telefone, senha } = req.body;
  
  if (telefone === "11999990001" && senha === "123456") {
    return res.json({
      usuario: DEMO_USUARIO,
      token: "demo-jwt-token-" + Date.now(),
    });
  }
  
  res.status(401).json({ error: "Credenciais inválidas" });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    return res.json(DEMO_USUARIO);
  }
  res.status(401).json({ error: "Não autenticado" });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

// Config routes
app.get("/api/campanha/config", (req, res) => {
  res.json(DEMO_CONFIG);
});

app.patch("/api/campanha/config", (req, res) => {
  const updated = { ...DEMO_CONFIG, ...req.body };
  res.json(updated);
});

// Pessoas routes
app.get("/api/contatos", (req, res) => {
  res.json({
    data: DEMO_PESSOAS,
    total: DEMO_PESSOAS.length,
    pagina: 1,
    por_pagina: 20,
  });
});

app.get("/api/contatos/:id", (req, res) => {
  const pessoa = DEMO_PESSOAS.find((p) => p.id === parseInt(req.params.id));
  if (pessoa) {
    return res.json(pessoa);
  }
  res.status(404).json({ error: "Pessoa não encontrada" });
});

app.post("/api/contatos", (req, res) => {
  const newPessoa = {
    id: DEMO_PESSOAS.length + 1,
    ...req.body,
    criado_em: new Date().toISOString(),
  };
  DEMO_PESSOAS.push(newPessoa);
  res.status(201).json(newPessoa);
});

// Agenda routes
app.get("/api/agenda", (req, res) => {
  res.json({
    data: [
      {
        id: 1,
        titulo: "Reunião com eleitores",
        data: new Date().toISOString(),
        local: "Praça Central",
        descricao: "Reunião estratégica",
      },
    ],
    total: 1,
  });
});

// Usuarios routes
app.get("/api/usuarios", (req, res) => {
  res.json({
    data: [DEMO_USUARIO],
    total: 1,
  });
});

// Dashboard routes
app.get("/api/dashboard/vereador", (req, res) => {
  res.json({
    total_pessoas: DEMO_PESSOAS.length,
    total_agendas: 1,
    intencao_sim: 1,
    intencao_nao: 0,
    intencao_indeciso: 1,
  });
});

app.get("/api/dashboard/coordenador", (req, res) => {
  res.json({
    total_pessoas: DEMO_PESSOAS.length,
    total_líderes: 1,
    cobertura_bairros: "80%",
  });
});

// Catch-all for unmapped routes
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado: " + req.path });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ➜  API Server rodando em porta ${PORT}`);
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  console.log(`  ➜  Network: http://192.168.1.11:${PORT}/\n`);
});
