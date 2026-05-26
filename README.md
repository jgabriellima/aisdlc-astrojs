# aisdlc-astrojs

Astro.js site bootstrapped with the [AI-SDLC](https://ai-sdlc.io/docs/getting-started) orchestrator. **Cursor is the agent runtime** for pipeline execution.

**Repositório:** https://github.com/jgabriellima/aisdlc-astrojs  
**Issue pronta para processar:** [#1 — blog engine](https://github.com/jgabriellima/aisdlc-astrojs/issues/1)

```sh
cd ~/workspaces/jambu/aisdlc-astrojs
npm run ai-sdlc:run -- --issue 1
```

## Prerequisites

- Node.js >= 22
- npm >= 9
- [Cursor CLI](https://cursor.com/docs/cli) (`cursor-agent` on PATH)
- `CURSOR_API_KEY` from Cursor Dashboard → Integrations

## Quick start

### 1. Environment

```sh
cp .env.example .env
# Edit .env — set CURSOR_API_KEY only; GitHub token comes from `gh auth login`
gh auth login   # if not already authenticated

npm run ai-sdlc:check-cursor
```

The CLI wrapper reads `.env` for `CURSOR_API_KEY` and resolves `GITHUB_TOKEN` from `gh auth token` automatically.

### 2. Verify Cursor runtime

```sh
npm run ai-sdlc:check-cursor
npm run ai-sdlc:health
npm run ai-sdlc:validate
```

### 3. Astro dev server

```sh
npm install
npm run dev
```

Open `http://localhost:4321`.

### 4. AI-SDLC pipeline (Cursor runner)

O parâmetro `--issue` é o **número da issue no GitHub** que o agente deve implementar — não é um ID interno do AI-SDLC. Você cria a issue primeiro (ver [tutorial abaixo](#tutorial-criar-uma-feature-com-ai-sdlc-exemplo-blog-engine)), anota o número que o GitHub atribui (ex.: `#3`) e passa esse valor:

```sh
# substitua 3 pelo número real da sua issue
npm run ai-sdlc:run -- --issue 3
```

O orchestrator lê título, descrição e critérios de aceite dessa issue, cria a branch `ai-sdlc/<número>-<slug>`, roda o Cursor agent e abre um PR. Requer `GH_TOKEN` + repositório remoto configurado.

The wrapper in `scripts/ai-sdlc-cli.mjs` injects `CursorRunner` (`cursor-agent --print`) instead of the stock CLI default (`ClaudeCodeRunner`).

Optional model override:

```sh
export AI_SDLC_CURSOR_MODEL=composer-2
```

See the [Runners reference](https://ai-sdlc.io/docs/api-reference/runners) for env vars.

## Tutorial: criar uma feature com AI-SDLC (exemplo: blog engine)

Este walkthrough mostra o fluxo completo — da issue no GitHub até o PR mergeável — usando Cursor como runtime. O exemplo implementa um **blog engine** mínimo em Astro (content collections + listagem + post individual).

### O que o pipeline vai fazer

O orchestrator lê a issue, valida quality gates, cria a branch `ai-sdlc/<issue>-<slug>`, invoca `cursor-agent` para implementar, roda gates de review e abre um PR. O escopo sugerido para a issue:

| Entregável | Caminho esperado |
| --- | --- |
| Schema de conteúdo | `src/content/config.ts` |
| Posts de exemplo | `src/content/blog/*.md` |
| Listagem | `src/pages/blog/index.astro` |
| Página de post | `src/pages/blog/[...slug].astro` |
| Layout base | `src/layouts/BlogLayout.astro` |
| Home linkando o blog | `src/pages/index.astro` |

### Pré-requisitos operacionais

Além do [Quick start](#quick-start) acima:

1. Repositório no GitHub (local ou remoto).
2. `GH_TOKEN` com escopo `repo` (issues + PRs + push).
3. `CURSOR_API_KEY` exportado no shell.
4. Remote `origin` configurado (substitui `your-org` em `.ai-sdlc/pipeline.yaml`).

```sh
cd ~/workspaces/jambu/aisdlc-astrojs

git remote add origin git@github.com:SEU-ORG/aisdlc-astrojs.git
git push -u origin main

# carregar env
cp .env.example .env
# editar CURSOR_API_KEY e GH_TOKEN
export $(grep -v '^#' .env | xargs)

npm run ai-sdlc:check-cursor
npm run ai-sdlc:health
```

### Passo 1 — Criar a issue no GitHub

A pipeline dispara quando a issue recebe a label `ai-eligible` (ver `.ai-sdlc/pipeline.yaml`). A issue precisa de descrição e critérios de aceite — o quality gate `has-acceptance-criteria` exige isso.

```sh
gh issue create \
  --title "feat: blog engine with Astro content collections" \
  --label "ai-eligible" \
  --body "$(cat <<'EOF'
## Summary

Add a minimal blog engine to this Astro site using Content Collections.

## Acceptance criteria

- [ ] `src/content/config.ts` defines a `blog` collection (title, description, pubDate, draft)
- [ ] At least one sample post exists under `src/content/blog/`
- [ ] `/blog` lists posts sorted by date (newest first)
- [ ] `/blog/<slug>` renders a single post with title, date, and body
- [ ] Home page (`/`) links to the blog index
- [ ] `npm run build` completes without errors
- [ ] No edits to `.github/workflows/**` or `.ai-sdlc/**`

## Technical notes

- Astro 6 + TypeScript strict
- Static output only (no SSR)
- Use `@astrojs/markdown` defaults; no extra CSS files — Tailwind if styling is needed (`npx astro add tailwind`)
- Follow `.cursor/rules/ai-sdlc.mdc` constraints

## Out of scope

- Comments, RSS, pagination, CMS integration
EOF
)"
```

Anote o número da issue (ex.: `1`).

### Passo 2 — (Opcional) Validar DoR antes de rodar

DoR está em modo `warn-only` (`.ai-sdlc/dor-config.yaml`). Issues mal formadas geram aviso, não bloqueio. Confira que a issue tem ACs binários e escopo delimitado.

### Passo 3 — Executar o pipeline

```sh
npm run ai-sdlc:run -- --issue 1
```

Substitua `1` pelo número real.

O que acontece internamente:

```text
issue (label ai-eligible)
  → stage validate   (quality gates: descrição + ACs)
  → stage code       (CursorRunner → cursor-agent --print)
  → stage review     (quality gates pós-implementação)
  → PR aberto        (branch ai-sdlc/1-blog-engine-...)
```

Acompanhe logs no terminal. Timeout padrão do stage `code`: 30 min (`PT30M` em `pipeline.yaml`).

### Passo 4 — Revisar o PR

```sh
gh pr list
gh pr view --web
```

Checklist de revisão humana:

- Diff limitado ao escopo da issue (agent role bloqueia `.ai-sdlc/**` e workflows).
- `npm run build` passa no CI (`ai-sdlc/pr-ready`).
- Rotas `/`, `/blog`, `/blog/<slug>` funcionam localmente.

```sh
git fetch origin
git checkout ai-sdlc/1-blog-engine-with-astro-content-collections   # nome real da branch
npm install
npm run dev
# abrir http://localhost:4321/blog
```

### Passo 5 — Merge e cleanup

Após aprovação:

```sh
gh pr merge --squash
git checkout main
git pull origin main
npm run build
```

A branch `ai-sdlc/*` é removida no merge (`cleanup: on-merge` em `pipeline.yaml`).

### Passo 6 — Verificar autonomia e estado

```sh
npm run ai-sdlc -- agents
npm run ai-sdlc -- status
```

O tracker de autonomia (`.ai-sdlc/autonomy-policy.yaml`) registra sucessos/falhas do agente — base para promoção de trust level em runs futuros.

---

### Alternativa: implementar no Cursor sem pipeline

Se você ainda não tem GitHub configurado, pode pedir a mesma feature diretamente no Cursor (Agent mode) com o MCP `ai-sdlc` ativo:

1. Abra o projeto no Cursor (`~/workspaces/jambu/aisdlc-astrojs`).
2. Confirme que `.cursor/mcp.json` está carregado (reload window se necessário).
3. Cole o corpo da issue (Passo 1) no chat e peça implementação.
4. Valide manualmente:

```sh
npm run build
npm run dev
```

Depois de ter remote GitHub, converta o trabalho em PR normal ou re-execute o pipeline numa issue espelhando o que já foi feito.

---

### Troubleshooting

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| `CURSOR_API_KEY is required` | Env não exportado | `export $(grep -v '^#' .env \| xargs)` |
| Pipeline não dispara | Label ausente | `gh issue edit N --add-label ai-eligible` |
| Gate `has-acceptance-criteria` falha | Issue sem ACs | Edite a issue; re-rode o pipeline |
| `your-org` no pipeline | Sem git remote | Configure `origin` e atualize `.ai-sdlc/pipeline.yaml` |
| Agente editou `.ai-sdlc/` | Violou `blockedPaths` | Reverta; re-rode com issue mais explícita |
| PR check `ai-sdlc/pr-ready` falha | Build ou gate CI | Veja logs em Actions; corrija ou use `npm run ai-sdlc -- run --issue N` de novo |

Documentação oficial: [Getting Started](https://ai-sdlc.io/docs/getting-started) · [Runners](https://ai-sdlc.io/docs/api-reference/runners)

## Cursor integration

| Path | Purpose |
| --- | --- |
| `.cursor/mcp.json` | `@ai-sdlc/mcp-advisor` MCP server (pinned to orchestrator 0.10.0) |
| `.cursor/settings.json` | Context sources for `.ai-sdlc/` resources |
| `.cursor/rules/ai-sdlc.mdc` | Always-on agent constraints |

Reload the Cursor window after cloning so MCP and rules are picked up.

## AI-SDLC resources

| Resource | File |
| --- | --- |
| Pipeline | `.ai-sdlc/pipeline.yaml` |
| Agent role | `.ai-sdlc/agent-role.yaml` |
| Quality gates | `.ai-sdlc/quality-gate.yaml` |
| Autonomy policy | `.ai-sdlc/autonomy-policy.yaml` |

## Project structure

```text
/
├── .ai-sdlc/           # AI-SDLC resource definitions
├── .cursor/            # Cursor MCP, rules, context sources
├── .github/workflows/  # CI quality gates
├── public/
├── scripts/            # CLI wrapper + validation
├── src/pages/
└── package.json
```

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start Astro dev server |
| `npm run build` | Build production site |
| `npm run ai-sdlc:check-cursor` | Verify Cursor CLI + MCP + env |
| `npm run ai-sdlc:health` | Verify AI-SDLC config |
| `npm run ai-sdlc:validate` | Validate core YAML resources |
| `npm run ai-sdlc:run -- --issue N` | Run pipeline with Cursor runner |

## Global CLI (optional)

```sh
npm install -g @ai-sdlc/orchestrator
```

Prefer `npm run ai-sdlc -- <command>` — the global `ai-sdlc` symlink has a known entry-point bug; the local wrapper avoids it and pins Cursor as runner.
