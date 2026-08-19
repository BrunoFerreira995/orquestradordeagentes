# Figma MCP

O projeto pode usar o Figma MCP para obter contexto estruturado de arquivos, componentes, variáveis e frames antes de implementar tarefas de frontend.

## Ativar no Codex

1. Abra **Plugins** no Codex.
2. Clique em `+` ao lado de **Figma**.
3. Clique em **Install Figma**.
4. Autorize o acesso à conta Figma.

O servidor remoto recomendado pela Figma é:

```text
https://mcp.figma.com/mcp
```

Como alternativa, para usar o servidor desktop local, abra um arquivo no Figma Desktop, ative o MCP no Dev Mode e adicione no Codex:

```text
http://127.0.0.1:3845/mcp
```

## Uso nas tasks

Inclua a URL do arquivo ou frame Figma na descrição da task. O worker frontend deve consultar o contexto do design antes de criar componentes e registrar no resultado quais componentes, variáveis e decisões visuais foram utilizados.

O MCP não deve receber tokens Figma em `.env` ou no banco. A autenticação é gerenciada pelo plugin do Codex.
