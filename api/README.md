# API Elysia

Serviço de leitura para integrar dashboard e automações sem acoplar o processo Python.

```bash
bun install
DB_PATH=../data/agents.db bun run src/index.ts
```

Endpoints: `GET /health`, `GET /tasks`, `GET /tasks/:id`, `GET /workers` e `GET /metrics`.
O serviço usa o mesmo SQLite em modo somente leitura; submissão e execução continuam sob controle do orquestrador.
