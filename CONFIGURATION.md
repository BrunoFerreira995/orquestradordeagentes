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
| `API_TOKEN` | — | Token Bearer exigido para cancelar, repetir e alterar prioridade |
| `WEB_ORIGIN` | `http://localhost:3001` | Origem permitida pelo CORS da API |
| `ADMIN_EMAIL` | — | E-mail inicial do usuário administrador |
| `ADMIN_PASSWORD` | — | Senha inicial; usada somente na criação do administrador |
| `RESEND_API_KEY` | — | Chave opcional do provedor Resend para envio de recuperação |
| `EMAIL_FROM` | — | Remetente verificado usado pelo Resend |
| `APP_URL` | `WEB_ORIGIN` | URL usada nos links de recuperação |

O administrador pode criar usuários, alterar roles, resetar senhas e consultar a auditoria. A troca de senha do próprio usuário exige a senha atual. Com `RESEND_API_KEY` e `EMAIL_FROM`, a API envia links de recuperação com validade de 30 minutos e uso único; sem essas variáveis, a solicitação continua neutra, mas nenhum e-mail é enviado.

Workers enviam heartbeat durante a execução. Tasks `RUNNING` sem heartbeat por 120 segundos são recuperadas como `RETRYING` na inicialização; isso evita tasks órfãs sem reabrir uma execução ainda viva.
