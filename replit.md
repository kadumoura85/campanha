# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Recharts

## Application: Campanha Política Municipal

Sistema de gestão eleitoral responsivo (mobile-first) com dashboards por perfil, gestão de regiões, agenda, mapa estratégico e configuração da campanha.

### Hierarquia de Perfis
super_admin > vereador > coordenador_geral > coordenador_regional > lider > contatos

### Perfis e Dashboards
- **super_admin**: Acesso total — Dashboard vereador, Regiões, Agenda, Usuários, Config
- **vereador**: Dashboard estratégico com Recharts (pie + bar), Mapa, Regiões, Agenda, Contatos
- **coordenador_geral**: Dashboard operacional com ranking de coordenadores, Regiões, Contatos, Agenda
- **coordenador_regional**: Dashboard de região com ranking de líderes, Contatos, Agenda
- **lider**: Dashboard pessoal simples com "Olá" + base de contatos, Cadastrar, Agenda

### Usuários de teste (senha: 123456)
- 11999990000 → super_admin
- 11999990001 → vereador
- 11999990002 → coordenador_regional
- 11999990003 → coordenador_geral
- 11999990004 → lider

### Tabelas do banco
- `usuarios`: id, nome, telefone, email, senha_hash, tipo, coordenador_id, regiao_id, bairro_regiao, ativo, created_at
- `contatos`: id, nome, telefone, bairro, rua_referencia, nivel, observacao, lider_id, coordenador_id, regiao_id, created_at, updated_at
- `regioes`: id, nome, descricao, coordenador_regional_id, cor, prioridade, observacao_estrategica, created_at
- `eventos`: id, titulo, descricao, data, hora, local, tipo_evento, visibilidade, regiao_id, coordenador_regional_id, lider_id, criado_por, created_at
- `configuracao_campanha`: id, nome_candidato, foto_principal, slogan, numero, cor_primaria, cor_secundaria, logo, frase_institucional
- `observacoes_regiao`: id, regiao_id, autor_id, observacao, created_at

### Funcionalidades
- Login com JWT (token armazenado em localStorage) por telefone + senha
- Auth compartilhado via React Context (AuthProvider) — sem bug de race condition
- Dashboard por perfil com dados reais do banco
- Recharts (pie/bar charts) no dashboard do vereador e coordenador_geral
- CRUD de contatos com nível (contato/simpatizante/fechado) e seletor visual de nível
- Lista de contatos com busca e filtro por nível
- Módulo Regiões: listagem por prioridade (normal/atencao/prioritaria), detalhe com ranking de líderes
- Módulo Agenda: criação/listagem de eventos com tipos (reunião, caminhada, visita, comício, ação de rua)
- Módulo Mapa: visualização estratégica das regiões por força (forte/média/fraca/prioritária)
- Módulo Usuários: listagem por tipo, criar usuários, ativar/desativar
- Módulo Configuração: identidade da campanha (nome, número, slogan, cores)
- Observações estratégicas nas regiões (com histórico e autoria)

### Navegação (bottom nav, mobile-first)
- Bottom nav fixo com 4-5 tabs por perfil
- Header sticky com nome do usuário e botão "Sair"
- Roteamento via wouter com base="/campanha"

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   │   └── src/routes/
│   │       ├── auth.ts, usuarios.ts, contatos.ts
│   │       ├── dashboard.ts, regioes.ts, eventos.ts
│   │       └── configuracao.ts, health.ts
│   └── campanha/           # React+Vite frontend (path: /campanha)
│       └── src/
│           ├── contexts/AuthContext.tsx  # Auth React Context (shared state)
│           ├── hooks/useAuth.ts          # Re-exports from AuthContext
│           ├── lib/
│           │   ├── api.ts                # apiGet/apiPost/apiPatch/apiDelete
│           │   └── dashboard-path.ts     # getDashboardPath utility
│           ├── components/Layout.tsx     # Responsive layout + bottom nav
│           └── pages/
│               ├── login.tsx
│               ├── dashboard-vereador.tsx (Recharts)
│               ├── dashboard-coordenador-geral.tsx
│               ├── dashboard-coordenador-regional.tsx
│               ├── dashboard-lider.tsx
│               ├── regioes.tsx, regiao-detalhe.tsx
│               ├── agenda.tsx, mapa.tsx
│               ├── configuracao.tsx, usuarios.tsx
│               └── contatos.tsx, contato-form.tsx
├── lib/
│   ├── api-spec/           # OpenAPI spec
│   └── db/                 # Drizzle ORM schema + DB connection
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
