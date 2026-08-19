# Execução controlada

Cada worker recebe um `WorkspaceManager` confinado a `workspace/<worker-id>`. Caminhos absolutos, `..` e o diretório interno `.orchestrator` são rejeitados.

Antes de aplicar um conjunto de arquivos, `apply_files(task_id, files)` cria um snapshot. O snapshot permite gerar um diff unificado com `diff(task_id)` e restaurar o estado anterior com `rollback(task_id)`.

Comandos devem ser listas de argumentos, por exemplo:

```python
worker.sandbox.run(["python", "-m", "pytest"])
```

Eles executam sem shell, no workspace do worker, com `HOME` apontando para o workspace, `CI=1`, ambiente reduzido e timeout padrão de 120 segundos. Isso é uma barreira de escopo e timeout, não um sandbox de kernel; comandos não confiáveis ainda exigem isolamento externo (container, VM ou processo dedicado).

Workers backend, frontend e QA agora podem retornar um contrato JSON com `files` e `validation_commands`. A task entra em `AWAITING_APPROVAL` e não altera arquivos até a aprovação explícita:

```bash
python -m src.main approve TASK-1234
```

A aprovação aplica todos os arquivos, salva o diff, executa os comandos de validação e faz rollback automático se algum comando retornar código diferente de zero.

Tasks independentes atravessam o gate juntas e podem ser consumidas por workers diferentes em paralelo. Uma dependência falha bloqueia seus descendentes; dependências inexistentes são marcadas como `FAILED`; ciclos são marcados como `BLOCKED`, evitando espera indefinida.
