# Deploy

## Visão geral

O sistema tem 2 partes:

- `artifacts/api-server`: API Express
- `artifacts/campanha`: frontend Vite

Antes do deploy, confirme:

- PostgreSQL acessível
- `DATABASE_URL` válida
- `JWT_SECRET` forte
- pasta `uploads/` preservada no servidor

## Variáveis de ambiente

### API

Use como base `artifacts/api-server/.env.example`:

```env
PORT=8787
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=troque-esta-chave-em-producao
LOG_LEVEL=info
```

### Frontend

Use como base `artifacts/campanha/.env.example`:

```env
PORT=5173
BASE_PATH=/campanha/
API_TARGET=http://127.0.0.1:8787
```

## Build

Na raiz:

```powershell
pnpm install
pnpm run typecheck
pnpm -C artifacts/api-server run build
pnpm -C artifacts/campanha run build
```

## Subida em produção

### API

```powershell
$env:PORT='8787'
$env:DATABASE_URL='postgresql://usuario:senha@host:5432/banco'
$env:JWT_SECRET='uma-chave-forte'
pnpm -C artifacts/api-server run start
```

### Frontend

O frontend gera arquivos estáticos em `artifacts/campanha/dist`.

Você pode:

- servir esse diretório por Nginx, Apache ou IIS
- manter o `BASE_PATH=/campanha/`
- apontar `/api` para a API
- apontar `/uploads` para a API ou para o mesmo storage compartilhado

## Checklist final

- `GET /api/auth/me` responde `401` sem token
- login responde `200`
- dashboards carregam por perfil
- tela `Bairros` abre
- upload de foto e santinho funciona
- `uploads/` continua disponível após reinício

## Observações

- O arquivo real de ambiente da API no projeto hoje está como `.env.env`; em produção vale padronizar conforme o seu servidor.
- Se usar proxy reverso, preserve o caminho `/campanha/` no frontend.
- Para funcionar como PWA instalável no celular, publique o frontend em `HTTPS`. No iPhone, a instalação costuma ser feita por `Compartilhar -> Adicionar à Tela de Início`.
