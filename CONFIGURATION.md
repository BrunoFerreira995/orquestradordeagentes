# Configuração

Copie `.env.example` para `.env`. As variáveis principais são:

| Variável | Padrão | Função |
|---|---:|---|
| `DB_PATH` | `data/agents.db` | Banco SQLite compartilhado |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Endpoint do Ollama |
| `OLLAMA_MODEL` | `lfm2.5-thinking:latest` | Modelo usado pelos workers |
| `OLLAMA_TIMEOUT` | `600` | Timeout da chamada em segundos |
| `MAX_RETRIES` | `3` | Tentativas antes de marcar a task como falha |
| `MAX_CONCURRENT_REQUESTS` | `4` | Limite global por processo |
| `WORKER_COUNT` | `4` | Quantidade esperada de workers |

Workers enviam heartbeat durante a execução. Tasks `RUNNING` sem heartbeat por 120 segundos são recuperadas como `RETRYING` na inicialização; isso evita tasks órfãs sem reabrir uma execução ainda viva.
