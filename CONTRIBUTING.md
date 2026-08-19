# Convenções

- Python 3.11+, `pytest` para testes e mudanças pequenas.
- IDs de task são estáveis; dependências referenciam IDs, nunca títulos.
- Toda transição de estado deve persistir `error`, `finished_at`, `progress` e `current_step` quando aplicável.
- Worker deve registrar início, progresso e resultado; falhas transitórias usam `RETRYING` e têm limite de tentativas.
- Rode `python -m pytest -q` antes de abrir um pull request.
