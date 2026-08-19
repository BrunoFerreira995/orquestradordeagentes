# Templates de projeto

## Variantes

- `nextjs-elysia`: frontend e backend;
- `nextjs-only`: somente frontend;
- `elysia-only`: somente backend.

## `nextjs-elysia`

Template composto por:

- `web/`: aplicação Next.js com TypeScript, App Router e ESLint;
- `api/`: aplicação Elysia criada pelo scaffold oficial do Bun;
- `template.json`: metadados e comandos usados na geração.

Gere um projeto novo com:

```bash
./scripts/create_project.sh workspace/meu-projeto
```

Para criar e iniciar os serviços automaticamente, use `./scripts/create_project.sh workspace/meu-projeto --start`. As portas padrão são API `3000` e frontend `3001`; altere com `--api-port 4100 --web-port 4101`. Projetos existentes podem ser iniciados com `./scripts/start_project.sh workspace/meu-projeto`. O launcher imprime os PIDs e grava logs em `workspace/meu-projeto/logs/api.log` e `workspace/meu-projeto/logs/web.log`.

Para preparar dados locais de teste, use `./scripts/create_test_db.sh workspace/meu-projeto`. Ele aplica as migrations SQLite e cria `admin@test.local` com senha `password123` no banco isolado `api/data/test.db`.

O destino deve estar dentro de `workspace/`, precisa estar vazio e não é sobrescrito. O processo exige Node.js/npx e Bun, além de acesso à internet para baixar os scaffolds e dependências. A configuração comum é copiada para `.env.example`.

Os templates que incluem backend (`nextjs-elysia` e `elysia-only`) também recebem autenticação base em `api/src/index.ts`: login, sessões de 8 horas, logout, troca de senha e recuperação por token de 30 minutos. Para desenvolvimento local, `DEV_SHOW_RECOVERY_TOKEN=true` permite visualizar o token na resposta; em produção, conecte um provedor de e-mail.

Eles também incluem autorização por roles: `admin` (`tasks:read`, `tasks:write`, `users:manage`, `audit:read`), `operator` (`tasks:read`, `tasks:write`) e `viewer` (`tasks:read`). O backend persiste usuários, sessões e tokens de recuperação em SQLite próprio (`DB_PATH`, padrão `data/project.db`), separado do orquestrador. Para PostgreSQL, defina `DB_DRIVER=postgres` e `DATABASE_URL`; o adapter usa pool configurável por `DB_POOL_SIZE` e as migrations versionadas ficam em `api/migrations/`. O catálogo atual inclui os domínios de autenticação (`001_auth`) e negócio (`002_domain`: `projects`, `items` e `audit_events`).

Nos templates com frontend, `web/src/app/web-api.ts` centraliza a integração com a API Elysia usando `NEXT_PUBLIC_API_URL`, incluindo login, restauração de sessão, permissões, logout e recuperação de senha.

Os templates também geram as páginas `/`, `/dashboard`, `/users` e `/settings`. Após o login, a navegação permite acessar o dashboard do projeto, consultar tasks/workers do orquestrador e visualizar usuários e configurações.

Os projetos com backend recebem testes Bun em `api/tests/` (health check e autenticação ponta a ponta); os projetos com frontend recebem testes do cliente em `web/tests/`. O workflow `.github/workflows/ci.yml` executa testes, lint e build.

O backend também emite logs JSON com `timestamp`, `level`, `scope`, `request_id` e evento (`request.started`, `request.completed` ou `request.failed`). Ajuste `LOG_LEVEL` (`debug`, `info`, `warn` ou `error`) conforme o ambiente. Erros inesperados retornam `{ error, request_id }` sem expor detalhes internos; o frontend os representa como `ApiError`.

A integração com o orquestrador é opcional. Defina `ORCHESTRATOR_API_URL`, `ORCHESTRATOR_API_TOKEN` e, opcionalmente, `ORCHESTRATOR_PROJECT_ID` para habilitar `/orchestrator/status`, `/orchestrator/tasks` e `/orchestrator/workers`. Sem URL configurada, os endpoints retornam `{ enabled: false }`; o dashboard central pode consumi-los com a sessão do projeto.
