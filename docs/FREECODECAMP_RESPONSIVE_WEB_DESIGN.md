# Trilha freeCodeCamp — Responsive Web Design

Esta trilha usa o frontend Next.js como laboratório para praticar HTML semântico, CSS responsivo, acessibilidade e layout. Ela complementa os exercícios oficiais do freeCodeCamp; o projeto do repositório não substitui a submissão dos projetos na plataforma.

## Ordem de estudo

1. HTML semântico: `header`, `nav`, `main`, `section`, `form`, `label`, títulos e landmarks.
2. CSS: seletores, cascade, box model, cores, tipografia, espaçamento e posicionamento.
3. Layout: Flexbox, CSS Grid, `minmax`, `clamp`, media queries e mobile-first.
4. Acessibilidade: foco visível, contraste, labels, navegação por teclado e HTML semântico.
5. Formulários: estados de erro, mensagens, `aria-live` e validação.
6. Projeto final: aplicar tudo no dashboard em `web/src/app`.

## Cinco projetos da certificação

Faça os projetos oficiais no freeCodeCamp e use este repositório para consolidar os mesmos conceitos:

| Projeto oficial | Aplicação neste projeto |
| --- | --- |
| Tribute Page | Página de apresentação do projeto e sua missão |
| Survey Form | Formulário de criação/configuração de task |
| Product Landing Page | Página inicial do orquestrador |
| Technical Documentation Page | Documentação de API, workers e migrations |
| Personal Portfolio Webpage | Dashboard/portfolio com métricas e resultados |

Os cinco projetos são os projetos de certificação tradicionalmente associados à trilha Responsive Web Design; confirme os requisitos atuais diretamente na [trilha oficial](https://www.freecodecamp.org/learn/responsive-web-design/), pois o currículo pode evoluir.

## Aplicação nas páginas geradas

O template já gera estas rotas:

- `/`: conta e autenticação;
- `/dashboard`: status do orquestrador, tasks e workers;
- `/users`: usuários e roles;
- `/settings`: configurações da conta.

Para cada página, siga este ciclo:

1. escreva o HTML semântico;
2. implemente o layout mobile-first;
3. teste em 320px, 768px e 1440px;
4. navegue usando somente teclado;
5. confira foco, contraste, labels e mensagens de erro;
6. gere screenshots para comparar as telas.

## Checklist de conclusão

- [x] Não existe rolagem horizontal em telas pequenas — revisado no viewport `390x844`.
- [x] Todos os campos têm `label` ou `aria-label`.
- [x] A ordem dos títulos é lógica (`h1`, `h2`, `h3`).
- [x] Links e botões têm foco visível.
- [x] O layout funciona em mobile, tablet e desktop — revisado em `390x844`, `768x1024` e `1440x1000`.
- [x] Estados de carregamento, sucesso e erro estão representados nas páginas e no cliente da API.
- [x] As páginas `/`, `/dashboard`, `/users` e `/settings` possuem screenshots autenticados válidos.
- [x] `bun run lint` e `bun run build` passam.

Última validação: a API respondeu em `4100`, o frontend em `4101` e as quatro rotas foram capturadas com autenticação nos três viewports. Não foi observada rolagem horizontal.

## Executar e revisar visualmente

```bash
./scripts/start_project.sh workspace/meu-projeto \
  --api-port 4100 \
  --web-port 4101

./scripts/screenshot_project.sh \
  --url http://localhost:4101 \
  --project-dir workspace/meu-projeto/web \
  --output screenshots/meu-projeto \
  --email admin@test.local \
  --password password123 \
  --headed
```

Consulte também o [currículo oficial do freeCodeCamp](https://www.freecodecamp.org/learn/responsive-web-design/).
