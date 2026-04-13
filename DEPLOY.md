# Deploy

## Caminho recomendado

Para este projeto, o caminho mais simples e mais adequado para celular e:

- frontend em `Vercel`
- API + PostgreSQL em `Railway` ou `Render`

Para uso em telefone, prefira esta estrutura:

- frontend em `https://app.seu-dominio.com/`
- API em `https://api.seu-dominio.com/`

Isso reduz atrito no PWA, simplifica links e melhora a instalacao no iPhone.

## Estrutura do projeto

- `artifacts/campanha`: frontend
- `artifacts/api-server`: API
- `lib/db`: banco e schemas compartilhados

## Variaveis de ambiente

### API

Use como base `artifacts/api-server/.env.production.example`:

```env
PORT=8787
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=troque-esta-chave-em-producao
LOG_LEVEL=info
CORS_ORIGIN=https://app.seu-dominio.com
```

`CORS_ORIGIN` aceita uma ou mais origens separadas por virgula.

### Frontend

Use como base `artifacts/campanha/.env.production.example`:

```env
BASE_PATH=/
VITE_API_BASE_URL=https://api.seu-dominio.com
```

Em producao, o mais importante para o navegador e:

- `VITE_API_BASE_URL`

Esse valor deve apontar para a URL publica da API.

## Build local para conferencia

Na raiz:

```powershell
pnpm install
pnpm run typecheck
pnpm -C artifacts/api-server run build
pnpm -C artifacts/campanha run build
```

## Publicando a API

### Railway ou Render

Use estes comandos:

- build:

```powershell
pnpm install
pnpm -C artifacts/api-server run build
```

- start:

```powershell
pnpm -C artifacts/api-server run start
```

Configure as variaveis:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `LOG_LEVEL`
- `CORS_ORIGIN`

Importante:

- preserve a pasta `uploads/` ou use storage persistente
- confirme que o PostgreSQL esta acessivel pela `DATABASE_URL`
- configure `CORS_ORIGIN=https://app.seu-dominio.com`

## Publicando o frontend

### Vercel

O projeto ja tem `artifacts/campanha/vercel.json`.

Na Vercel:

1. importe o repositorio
2. defina o diretorio raiz como `artifacts/campanha`
3. configure as variaveis:
   - `BASE_PATH=/`
   - `VITE_API_BASE_URL=https://api.seu-dominio.com`
4. faca o deploy
5. vincule um dominio HTTPS, por exemplo `app.seu-dominio.com`

## PWA

O frontend ja esta preparado como PWA.

Para funcionar como app instalavel:

- publique em `HTTPS`
- mantenha `manifest.webmanifest`
- mantenha `sw.js`
- prefira publicar o frontend em `/`
- no iPhone, abra no `Safari`

No iPhone, a instalacao costuma ser feita por:

- `Compartilhar -> Adicionar a Tela de Inicio`

## Checklist final

- login responde normalmente
- dashboards carregam por perfil
- tela `Bairros` abre
- uploads funcionam
- santinho baixa corretamente
- `GET /api/auth/me` responde `401` sem token
- frontend consegue falar com a API publica
- `Adicionar a Tela de Inicio` funciona no iPhone
- voltar de offline para online nao recarrega a tela no meio do uso

## Observacoes

- o arquivo local da API no projeto ainda usa `.env.env`; em producao vale padronizar conforme o servidor
- se quiser simplificar a URL publica, publique o frontend em `/` em vez de `/campanha/`
