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

Para gerar um projeto completo usando o template Next.js + Elysia:

```bash
./scripts/create_project.sh workspace/meu-projeto
```

O gerador cria `web/`, `api/` e `template.json` dentro do destino. O diretório precisa estar vazio e a geração exige Node.js/npx, Bun e internet para baixar os scaffolds.

### Rodar um projeto gerado

Depois da geração, copie a configuração compartilhada e ajuste as credenciais:

```bash
cd workspace/meu-projeto
cp .env.example .env
```

Para criar e iniciar backend e frontend automaticamente:

```bash
cd ../..
./scripts/create_project.sh workspace/meu-projeto --start
```

As portas padrão são API `3000` e frontend `3001`. Para usar portas diferentes:

```bash
./scripts/start_project.sh workspace/meu-projeto \
  --api-port 4100 \
  --web-port 4101
```

Acesse `http://localhost:3001` (ou a porta configurada do frontend). O launcher imprime os PIDs e grava os logs em:

```text
workspace/meu-projeto/logs/api.log
workspace/meu-projeto/logs/web.log
```

Para iniciar os serviços separadamente:

```bash
cd workspace/meu-projeto/api
PORT=4100 bun run dev
```

Em outro terminal:

```bash
cd workspace/meu-projeto/web
NEXT_PUBLIC_API_URL=http://localhost:4100 bun run dev -- -p 4101
```

Para parar, use os PIDs mostrados pelo launcher, por exemplo:

```bash
kill API_PID FRONTEND_PID
```

Substitua `API_PID` e `FRONTEND_PID` pelos números reais exibidos no terminal. As portas da API e do frontend devem ser diferentes e estar livres.

Se aparecer `EADDRINUSE`, descubra o processo que está usando a porta e encerre-o:

```bash
lsof -nP -iTCP:4101 -sTCP:LISTEN
kill PID
```

Ou escolha outra porta, por exemplo `--web-port 4102`.

Se a API já estiver funcionando e você quiser iniciar somente o frontend, reutilize-a:

```bash
./scripts/start_project.sh workspace/meu-projeto \
  --api-port 4100 \
  --web-port 4102 \
  --reuse-api
```

### Criar banco de teste

Para inicializar um banco SQLite isolado, aplicar as migrations e criar um administrador de teste:

```bash
./scripts/create_test_db.sh workspace/meu-projeto
```

O banco padrão é `workspace/meu-projeto/api/data/test.db`, com o usuário `admin@test.local` e senha `password123`. Para alterar esses valores:

```bash
./scripts/create_test_db.sh workspace/meu-projeto \
  --db-path data/integration.db \
  --admin-email qa@example.com \
  --admin-password 'senha-segura-de-teste'
```

O script é idempotente: aplica apenas migrations ainda não registradas e preserva os dados existentes.

### Capturar screenshots das páginas

O screenshot percorre os links internos encontrados na página inicial. Portanto, primeiro deixe o frontend funcionando e confirme que ele abre no navegador.

#### 1. Instalar o Playwright

Faça a instalação dentro do frontend do projeto:

```bash
(cd workspace/meu-projeto/web && npm install -D playwright && npx playwright install chromium)
```

O segundo comando instala o navegador Chromium usado pelo script.

#### 2. Iniciar o frontend

```bash
./scripts/start_project.sh workspace/meu-projeto \
  --api-port 4100 \
  --web-port 4101
```

Ou inicie somente o frontend:

```bash
cd workspace/meu-projeto/web
NEXT_PUBLIC_API_URL=http://localhost:4100 bun run dev -- -p 4101
```

#### 3. Capturar as páginas

Em outro terminal, na raiz do repositório:

```bash
./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --api-url http://localhost:4100 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto
```

O script abre a URL, segue somente links do mesmo domínio, visita cada rota, aguarda a rede estabilizar e salva um PNG em tela cheia. Por exemplo, a página inicial será salva como `screenshots/meu-projeto/home.png`.

Para revisar responsividade, repita a captura em três viewports:

```bash
./scripts/screenshot_project.sh --url http://localhost:4101 --api-url http://localhost:4100 --project-dir workspace/meu-projeto/web --output screenshots/meu-projeto/mobile --viewport 390x844 --email admin@test.local --password password123
./scripts/screenshot_project.sh --url http://localhost:4101 --api-url http://localhost:4100 --project-dir workspace/meu-projeto/web --output screenshots/meu-projeto/tablet --viewport 768x1024 --email admin@test.local --password password123
./scripts/screenshot_project.sh --url http://localhost:4101 --api-url http://localhost:4100 --project-dir workspace/meu-projeto/web --output screenshots/meu-projeto/desktop --viewport 1440x1000 --email admin@test.local --password password123
```

Ou automatize os três tamanhos com um único comando:

```bash
./scripts/screenshot_responsive.sh \
  --url http://localhost:4101 \
  --api-url http://localhost:4100 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --email admin@test.local \
  --password password123
```

Os resultados ficam em `screenshots/meu-projeto/mobile`, `tablet` e `desktop`. Adicione `--headed` para visualizar o Chromium durante a execução.

Validação atual concluída: as rotas `/`, `/dashboard`, `/users` e `/settings` foram capturadas com autenticação nos viewports `390x844`, `768x1024` e `1440x1000`, sem rolagem horizontal observada.

Além dos links, ele procura páginas `page.tsx`/`page.ts` em `src/app`. Para aplicações com rotas que não aparecem em links, informe-as manualmente:

```bash
./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --routes /dashboard,/users,/settings
```

Se o resultado continuar mostrando apenas `/`, o projeto realmente possui somente a página inicial ou as outras telas ainda não foram criadas. O script não inventa rotas que não existem na aplicação.

Se as páginas exigirem login, informe as credenciais. O script preenche o formulário de entrada, inicia a sessão e só então percorre os links:

```bash
./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --email admin@example.com \
  --password 'sua-senha'
```

Quando o Playwright não estiver instalado, o próprio script instala a dependência no diretório indicado por `--project-dir` e baixa o Chromium automaticamente.

Para acompanhar o Chromium visualmente durante o login e a navegação, adicione `--headed`:

```bash
./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --email admin@test.local \
  --password password123 \
  --headed \
  --slow-mo 300 \
  --wait 1000
```

Em modo `--headed`, não pressione `Ctrl+C` enquanto a captura estiver em andamento. O script usa `domcontentloaded` e `--wait` para funcionar também com o servidor Next.js em modo de desenvolvimento, que mantém uma conexão HMR aberta.

Para limitar a quantidade de páginas:

```bash
./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --max-pages 20
```

Se aparecer `Playwright não encontrado`, execute novamente a instalação do passo 1. Se aparecer erro de conexão, verifique se a porta informada em `--url` corresponde à porta real do frontend. Rotas que falharem são exibidas no terminal e não interrompem a captura das demais páginas.

### Roadmap dos projetos gerados

O script cria a estrutura inicial do projeto; os recursos abaixo são a evolução planejada de cada projeto gerado:

- [x] Frontend Next.js com TypeScript, App Router e ESLint.
- [x] Páginas geradas de conta, dashboard, usuários e configurações com navegação autenticada.
- [x] Trilha documentada de Responsive Web Design aplicada às páginas e ao dashboard Next.js.
- [x] Revisão visual responsiva concluída em mobile, tablet e desktop.
- [x] Backend Elysia com Bun e TypeScript.
- [x] Configuração compartilhada em `.env.example`.
- [x] Autenticação base nos templates com backend: login, sessões, logout, troca e recuperação de senha por token.
- [x] Autorização por roles e permissões nos templates com backend (`admin`, `operator`, `viewer`).
- [x] Persistência própria do projeto com SQLite (`DB_PATH`, banco separado do orquestrador).
- [x] Adicionar adapter PostgreSQL, migrations versionadas e autenticação usando o adapter nos templates com backend.
- [x] Migrar o projeto gerado de referência e adicionar migrations versionadas para os domínios de autenticação, projetos, itens e auditoria.
- [x] Integração inicial do frontend com a API Elysia: login, sessão, permissões, logout e recuperação de senha.
- [x] Testes unitários, integração e CI específicos do projeto gerado.
- [x] Observabilidade, logs JSON, correlação por `request_id` e tratamento padronizado de erros nos projetos gerados.
- [x] Integração opcional com o orquestrador, workers e dashboard central via `ORCHESTRATOR_API_URL`, token e endpoints protegidos de status, tasks e workers.
- [x] Scripts para criar e iniciar backend/frontend com portas configuráveis (`--start`, `--api-port` e `--web-port`).

### Figma MCP (opcional)

Para usar contexto de designs Figma nas tasks frontend, instale e autorize o plugin Figma no Codex. Consulte [`FIGMA_MCP.md`](FIGMA_MCP.md) para a configuração do servidor remoto ou desktop.

### Dashboard web

O dashboard Next.js fica em `web/` e consulta a API Elysia:

```bash
cd web
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

O dashboard oferece login por e-mail e senha. Para criar o primeiro administrador, defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de iniciar a API. As sessões expiram em 8 horas; `API_TOKEN` permanece disponível como credencial de serviço para automações. Defina também `WEB_ORIGIN` no processo da API.

Para trocar o modelo, altere `OLLAMA_MODEL` no `.env` e faça `ollama pull <modelo>`. Para 8 ou mais workers, aumente `WORKER_COUNT`, adicione entradas em `config/agents.yaml` e panes em `scripts/start_workers.sh`; a fila e o limite de concorrência não dependem de quatro workers.

## Segurança e limitações

A API exige autenticação para leitura e escrita. Usuários `viewer` possuem acesso somente leitura; `operator` pode executar ações operacionais; `admin` possui acesso administrativo. O token de serviço deve ser tratado como segredo de alta permissão. A execução de arquivos ocorre em workspace confinado, com aprovação, snapshot, diff, rollback e timeout; isolamento por container ainda é necessário para comandos não confiáveis.

## Testes

```bash
python -m pytest
```

## Roadmap de 1 ano

O roadmap abaixo descreve o estado real do projeto em agosto de 2026. Itens marcados como concluídos representam uma primeira implementação funcional; não significam que a capacidade já esteja pronta para produção em escala.

### Estado atual

- Orquestrador Python com fila SQLite, workers, retries, heartbeat e reconciliação de dependências.
- API Elysia com consultas, logs, métricas, templates e ações administrativas.
- Dashboard Next.js inicial em `web/`.
- Execução controlada com workspace confinado, snapshots, diffs, rollback e comandos com timeout.
- Aprovação explícita para propostas estruturadas de alteração de arquivos.
- Autenticação com usuários, sessões expiradas e roles `admin`, `operator` e `viewer`; ainda falta uma tela/API de administração de usuários.
- Administração de usuários, troca/reset de senha, recuperação por e-mail configurável e auditoria disponíveis na API e no dashboard.

### Meses 1–3 — Fundação

- [x] Estabilizar fila, dependências e concorrência com SQLite WAL, claims transacionais e backoff de retry.
- [x] Adicionar heartbeat, recuperação de leases expirados e proteção contra tasks órfãs.
- [x] Adicionar logs reais dos workers e progresso persistido no dashboard.
- [x] Criar a API separada em Elysia, com consultas e ações administrativas protegidas por token.
- [x] Adicionar testes automatizados e CI para Python e API.
- [x] Documentar configuração, segurança e convenções do projeto.
- [x] Ampliar a cobertura com teste ponta a ponta envolvendo API, fila e workers.

**Status:** concluída como fundação operacional; a API agora também possui mutações administrativas controladas.

**Meta:** execução confiável sem tasks órfãs ou bloqueadas indefinidamente.

### Meses 4–6 — Execução real

- [x] Criar a camada de workspace confinado para leitura e alteração de arquivos.
- [x] Adicionar snapshots, diffs e rollback como primitives transacionais.
- [x] Adicionar execução de comandos sem shell, com ambiente reduzido e timeout.
- [x] Conectar aprovação explícita e interpretação de alterações estruturadas do modelo.
- [x] Validar alterações com testes automáticos após cada task aprovada.
- [x] Suportar tasks com múltiplos arquivos no fluxo do worker.
- [x] Expandir dependências com gates, propagação de falhas, detecção de ciclos e tasks independentes prontas em paralelo.
- [ ] Adicionar scheduler explícito com limites por projeto, fairness e prioridade dinâmica.

**Status:** primeira versão funcional; isolamento de processo/container e aprovação via dashboard ainda precisam amadurecer.

**Meta:** workers implementarem mudanças reais com segurança.

### Meses 7–9 — Produto

- [x] Criar o dashboard web inicial em Next.js (`web/`).
- [x] Exibir tasks, workers, logs, métricas e resultados básicos.
- [x] Implementar cancelamento, retry e priorização via API.
- [x] Adicionar login, sessões expiradas e RBAC básico para `admin`, `operator` e `viewer`.
- [x] Adicionar administração de usuários, troca/reset de senha e auditoria de ações na API e no dashboard.
- [x] Integrar envio de recuperação por e-mail via Resend, com token expirável e uso único.
- [x] Criar template executável Next.js + Elysia com geração automatizada via `scripts/create_project.sh`.
- [x] Adicionar variantes (`nextjs-only` e `elysia-only`), `.env.example` compartilhado e geração administrativa via API.
- [ ] Adicionar catálogo e acompanhamento visual da geração de templates no dashboard.
- [ ] Adicionar notificações por polling, webhook ou fila de eventos.
- [ ] Permitir aprovação, rollback e execução de templates pelo dashboard.

**Status:** dashboard operacional inicial com autenticação básica; precisa de hardening, gestão de usuários, notificações e fluxos completos de produto.

**Meta:** tornar o orquestrador útil para uma equipe de desenvolvimento.

### Meses 10–12 — Escala e maturidade

- [ ] Suportar múltiplos projetos e workspaces com isolamento por projeto.
- [ ] Adicionar execução distribuída dos workers.
- [ ] Melhorar métricas de tokens, tempo e custo por projeto/task.
- [ ] Implementar observabilidade, backups e recuperação testada.
- [ ] Avaliar automaticamente a qualidade das respostas e alterações.
- [ ] Preparar documentação pública, versionamento e processo de releases.
- [ ] Substituir o sandbox de processo por isolamento externo quando comandos não confiáveis forem habilitados.

**Meta:** oferecer um sistema self-hosted confiável para projetos reais.

### Resultado esperado após 1 ano

Orquestração multiagente self-hosted com frontend Next.js, backend Elysia, execução controlada e isolada, aprovação e rollback, dashboard operacional, autenticação por equipe, suporte a múltiplos projetos, notificações e métricas de qualidade, tempo e custo.
