# Segurança

O orquestrador não executa comandos, Git ou edição automática de arquivos. As respostas são persistidas no SQLite e cada worker recebe um workspace próprio.

A API Elysia é somente leitura e não oferece autenticação por padrão; exponha-a apenas em rede confiável ou atrás de um proxy com autenticação. Não publique o SQLite, os logs ou o endpoint do Ollama na internet. Segredos ficam no `.env`, que não deve ser commitado.
