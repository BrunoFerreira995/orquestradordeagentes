# Ollama Agent Workers

Orquestrador local de quatro workers especializados usando a API HTTP `/api/chat` do Ollama, SQLite e `asyncio`.

## Instalação

```bash
brew install ollama tmux              # macOS
# Linux: instale Ollama e tmux pelo gerenciador da distribuição
ollama serve
ollama pull lfm2.5-thinking
cp .env.example .env
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Como rodar

### 1. Instalar dependências

No macOS:

```bash
brew install ollama tmux python@3.11
```

No Linux, instale o Ollama seguindo a documentação da sua distribuição e instale `tmux`, Python 3.11+ e `curl` pelo gerenciador de pacotes.

Na raiz do projeto:

```bash
python3 -m venv .venv
source .venv/bin/activate             # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
```

### 2. Iniciar o Ollama

Em um terminal separado:

```bash
ollama serve
```

Em outro terminal, baixe o modelo configurado:

```bash
ollama pull lfm2.5-thinking
```

O modelo padrão pode ser alterado no arquivo `.env`:

```env
OLLAMA_MODEL=lfm2.5-thinking
OLLAMA_TIMEOUT=600
MAX_RETRIES=3
MAX_CONCURRENT_REQUESTS=4
```

### 3. Iniciar o orquestrador e os quatro workers

Com o ambiente virtual ativado:

```bash
./scripts/start.sh
```

Esse comando verifica o Ollama e o modelo, cria o banco/diretórios e inicia uma sessão tmux chamada `ollama-agents` com quatro panes:

```text
worker-1  Architect
worker-2  Backend
worker-3  Frontend
worker-4  QA
```

Para abrir os workers:

```bash
tmux attach -t ollama-agents
```

### 4. Enviar uma tarefa

Em outro terminal, com o ambiente virtual ativado:

```bash
python3 -m src.main run "analise o projeto, encontre os principais problemas e implemente as correções"
```

O Architect analisa e decompõe a tarefa. As subtarefas são colocadas na fila e distribuídas aos workers Backend, Frontend e QA conforme suas dependências.

### Criar um projeto Next.js

Para criar um projeto real dentro do workspace, use o comando seguro:

```bash
./scripts/create_nextjs.sh
```

O destino padrão é `workspace/nextjs-app`. Para escolher outra pasta dentro de `workspace`:

```bash
./scripts/create_nextjs.sh workspace/meu-app
```

### 5. Consultar status e tarefas

```bash
python3 -m src.main status
python3 -m src.main workers
python3 -m src.main tasks
```

Para visualizar o dashboard:

```bash
python3 -m src.main dashboard
```

Para modo interativo:

```bash
python3 -m src.main chat
```

Digite uma tarefa no prompt `ollama-agents>` e use `exit` ou `quit` para sair.

### 6. Parar o sistema

```bash
./scripts/stop.sh
```

Isso encerra a sessão tmux. O banco `data/agents.db` permanece preservado, e tarefas interrompidas são recuperadas na próxima inicialização.

Cada worker possui log em `logs/worker-N.log` e workspace próprio. O cliente usa streaming NDJSON, timeout configurável, semaphore de concorrência e retorna contadores de tokens.

### API Elysia (opcional)

Com Bun instalado, a API de consulta pode rodar separadamente:

```bash
cd api
bun install
DB_PATH=../data/agents.db bun run src/index.ts
```

Ela expõe `/health`, `/tasks`, `/tasks/:id`, `/workers` e `/metrics` em `http://localhost:3000`. O serviço abre o SQLite em modo somente leitura.

Para criar um novo backend Elysia dentro do workspace, execute a partir da raiz do projeto:

```bash
./scripts/create_backend.sh
# ou
./scripts/create_backend.sh workspace/meu-backend
```

O destino padrão é `workspace/backend`. O caminho pode ser relativo à raiz do projeto ou absoluto, desde que fique dentro de `workspace/`. O script exige Bun e não sobrescreve um destino que já contenha arquivos.

Para trocar o modelo, altere `OLLAMA_MODEL` no `.env` e faça `ollama pull <modelo>`. Para 8 ou mais workers, aumente `WORKER_COUNT`, adicione entradas em `config/agents.yaml` e panes em `scripts/start_workers.sh`; a fila e o limite de concorrência não dependem de quatro workers.

## Segurança e limitações

Esta base não executa edição de arquivos nem comandos Git automaticamente: a resposta do modelo é persistida como resultado, deixando a aplicação segura por padrão. O lock SQLite serializa claims; um gerenciador de locks/diffs por arquivo é o próximo passo para habilitar edição real. `start.sh` exige Ollama e tmux reais, mas os testes usam HTTP mockado e não precisam de Ollama.

## Testes

```bash
python -m pytest
```

## Roadmap de 1 ano

### Meses 1–3 — Fundação

- [x] Estabilizar fila, dependências e concorrência com SQLite WAL, claims transacionais e backoff de retry.
- [x] Adicionar heartbeat, recuperação de leases expirados e proteção contra tasks órfãs.
- [x] Adicionar logs reais dos workers e progresso persistido no dashboard.
- [x] Criar a API separada em Elysia, com endpoints de consulta em modo somente leitura.
- [x] Adicionar testes automatizados e CI para Python e API.
- [x] Documentar configuração, segurança e convenções do projeto.
- [x] Ampliar a cobertura com teste ponta a ponta envolvendo API, fila e workers.

**Status:** fundação implementada e validada com testes unitários, integração e CI.

**Meta:** execução confiável sem tasks órfãs ou bloqueadas indefinidamente.

### Meses 4–6 — Execução real

- Permitir que workers leiam e alterem arquivos dentro de um escopo controlado.
- Adicionar diffs, aprovação e rollback.
- Executar comandos em sandbox.
- Validar alterações com testes automáticos após cada task.
- Suportar tasks com múltiplos arquivos e dependências complexas.

**Meta:** workers implementarem mudanças reais com segurança.

### Meses 7–9 — Produto

- Criar o dashboard web em Next.js.
- Exibir tasks, workers, logs, métricas e resultados.
- Adicionar autenticação e permissões.
- Implementar notificações, cancelamento, retry e priorização.
- Criar templates de projetos, incluindo Next.js + Elysia.

**Meta:** tornar o orquestrador útil para uma equipe de desenvolvimento.

### Meses 10–12 — Escala e maturidade

- Suportar múltiplos projetos e workspaces.
- Adicionar execução distribuída dos workers.
- Melhorar métricas de tokens, tempo e custo.
- Implementar observabilidade, backups e recuperação.
- Avaliar automaticamente a qualidade das respostas.
- Preparar documentação pública e processo de releases.

**Meta:** oferecer um sistema self-hosted confiável para projetos reais.

### Resultado esperado após 1 ano

Orquestração multiagente com frontend Next.js, backend Elysia, execução controlada de código, aprovação e rollback, dashboard operacional, testes automatizados, suporte a múltiplos projetos e métricas de qualidade, tempo e custo.
