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
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS

## Application: Campanha Política Municipal

Sistema de gestão eleitoral responsivo com foco em mobile.

### Hierarquia
vereador > coordenador > líder > contatos

### Perfis
- **vereador**: vê tudo (dashboard geral, por coordenador, por bairro)
- **coordenador**: vê líderes e contatos da equipe, ranking de líderes
- **lider**: vê apenas seus próprios contatos, dashboard pessoal

### Usuários de teste (senha: 123456)
- vereador@campanha.com (vereador)
- coord1@campanha.com (coordenador)
- coord2@campanha.com (coordenador)
- lider1@campanha.com (líder)
- lider2@campanha.com (líder)
- lider3@campanha.com (líder)

### Tabelas do banco
- `usuarios`: id, nome, telefone, email, senha_hash, tipo, coordenador_id, bairro_regiao, ativo, created_at
- `contatos`: id, nome, telefone, bairro, rua_referencia, nivel, observacao, lider_id, coordenador_id, created_at, updated_at

### Funcionalidades
- Login com JWT (token armazenado em localStorage)
- Dashboard por perfil (vereador/coordenador/líder)
- Cadastro e edição de contatos
- Lista com filtros por bairro e nível
- Validação de telefone duplicado
- Herança automática de coordenador_id do líder logado
- Níveis: contato, simpatizante, fechado

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── campanha/           # React+Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── usuarios.ts # Tabela usuarios
│           └── contatos.ts # Tabela contatos
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
