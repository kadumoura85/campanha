# Campanha

Sistema de gestão de campanha política com foco em operação por bairro, equipe e conversão de contatos.

## O que o sistema faz

- organiza a campanha por `Bairro -> Coordenador -> Líder -> Pessoas`
- separa o uso por perfil: vereador, coordenador geral, coordenador e líder
- acompanha contatos, simpatizantes e fechados
- mostra dashboards com leitura de campanha e operação
- permite cadastro de equipe, pessoas, observações e agenda
- suporta identidade visual da campanha e uso como PWA

## Perfis do sistema

- `Vereador`: visão executiva da campanha
- `Coordenador geral`: visão técnica e operacional
- `Coordenador`: acompanhamento do próprio bairro e da equipe
- `Líder`: cadastro e conversão da própria base

## Tecnologias

- `pnpm` workspace
- `TypeScript`
- `React + Vite`
- `Express`
- `PostgreSQL`
- `Drizzle`

## Estrutura do projeto

```text
artifacts/
  api-server/        API Express
  campanha/          Frontend React/Vite
lib/
  db/                Banco e schemas
  api-spec/          Contrato OpenAPI
  api-client-react/  Cliente gerado
  api-zod/           Schemas Zod
```

## Como rodar localmente

### 1. Instalar dependências

```powershell
pnpm install
```

### 2. Configurar ambiente

API:

```env
PORT=8787
DATABASE_URL=postgresql://postgres:senha@localhost:5432/postgres
JWT_SECRET=troque-esta-chave
LOG_LEVEL=info
```

Frontend:

```env
PORT=5173
BASE_PATH=/campanha/
API_TARGET=http://127.0.0.1:8787
```

Use como base:

- `artifacts/api-server/.env.example`
- `artifacts/campanha/.env.example`

### 3. Rodar os serviços

API:

```powershell
pnpm -C artifacts/api-server run dev
```

Frontend:

```powershell
pnpm -C artifacts/campanha run dev
```

### 4. Acessar

- frontend: `http://localhost:5173/campanha/`
- API: `http://127.0.0.1:8787`

## Qualidade

Verificação de tipos:

```powershell
pnpm -C artifacts/campanha run typecheck
pnpm -C artifacts/api-server run typecheck
```

## Deploy

As instruções de publicação estão em [DEPLOY.md](./DEPLOY.md).

## Status

Primeira versão funcional com:

- dashboards por perfil
- operação por bairro
- gestão de equipe
- cadastro de pessoas
- filtros por nível político
- configuração visual da campanha
- suporte inicial a PWA
