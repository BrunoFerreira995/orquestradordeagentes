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

O destino deve estar dentro de `workspace/`, precisa estar vazio e não é sobrescrito. O processo exige Node.js/npx e Bun, além de acesso à internet para baixar os scaffolds e dependências. A configuração comum é copiada para `.env.example`.
