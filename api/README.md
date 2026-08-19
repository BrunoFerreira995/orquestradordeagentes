# API Elysia

Serviço de leitura para integrar dashboard e automações sem acoplar o processo Python.

```bash
bun install
DB_PATH=../data/agents.db bun run src/index.ts
```

Endpoints: `GET /health`, `GET /tasks`, `GET /tasks/:id`, `GET /workers`, `GET /metrics`, `GET /logs/:worker` e `GET /templates`.
Actions: `POST /tasks/:id/cancel`, `POST /tasks/:id/retry` e `PATCH /tasks/:id/priority`. Defina `API_TOKEN` para proteger essas ações com `Authorization: Bearer <token>`.
Templates: `POST /templates/:id/generate` (admin) aceita somente destinos no formato `workspace/nome`; variantes disponíveis: `nextjs-elysia`, `nextjs-only` e `elysia-only`.
Autenticação de usuários: `POST /auth/login` e `GET /auth/me`. Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` na primeira inicialização para criar o administrador; sessões expiram em 8 horas. Roles disponíveis: `admin`, `operator` e `viewer`.
Administração: `GET/POST /users`, `PATCH /users/:id/role`, `POST /users/:id/reset-password` e `GET /audit`.
Segurança de senha: `POST /auth/change-password` permite troca autenticada; `POST /auth/recovery/request` envia um link pelo Resend quando `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` estão configurados; `POST /auth/recovery/reset` consome o token uma única vez. Sem provedor configurado, a resposta continua neutra e administradores podem usar o endpoint de reset.
