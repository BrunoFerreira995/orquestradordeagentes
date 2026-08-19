# Segurança

O orquestrador mantém cada worker em um workspace próprio. A camada de execução controla caminhos, cria snapshots antes de alterações e executa comandos sem shell e com timeout. A interpretação de alterações estruturadas do modelo e a aprovação explícita ainda devem ser habilitadas antes de permitir edição automática em produção.

A API Elysia possui login por usuário, sessões expiradas, roles `admin`, `operator` e `viewer`, administração de usuários e auditoria de ações; o `API_TOKEN` continua disponível como credencial de serviço administrativa. Defina `ADMIN_PASSWORD` apenas por secret manager ou ambiente protegido e troque a credencial inicial após o bootstrap. Não publique o SQLite, os logs ou o endpoint do Ollama na internet. Segredos ficam no `.env`, que não deve ser commitado.
