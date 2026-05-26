# aisdlc-astrojs

Site Astro.js integrado ao [AI-SDLC](https://ai-sdlc.io/docs/getting-started). O runtime de agente é **Cursor** (`cursor-agent`).

| Recurso | Link |
| --- | --- |
| Repositório | https://github.com/jgabriellima/aisdlc-astrojs |
| Issue de exemplo | [#1 — blog engine](https://github.com/jgabriellima/aisdlc-astrojs/issues/1) |
| PR de exemplo | [#2 — implementação](https://github.com/jgabriellima/aisdlc-astrojs/pull/2) |

---

## Como funciona (leia antes de rodar)

O AI-SDLC **não cria issues**. Você descreve o trabalho numa issue do GitHub; o orchestrator **lê** essa issue e **produz** código + branch + PR.

```text
VOCÊ                          AI-SDLC (orchestrator + Cursor)
────                          ────────────────────────────────
Cria issue no GitHub    →     Busca issue #N via API
Escreve ACs + label     →     Valida quality gates
ai-eligible             →     Cria branch ai-sdlc/...
                              Invoca cursor-agent
                              Abre PR referenciando a issue
VOCÊ revisa e merge     →     (humano no loop)
```

O número em `--issue N` é o **número da issue no GitHub** (`/issues/1` → `--issue 1`). Não é ID interno do framework.

---

## Setup inicial (uma vez)

Pré-requisitos: Node.js 22+, `gh` CLI, `cursor-agent` no PATH, conta GitHub autenticada.

### 1. Clonar e instalar

```sh
git clone git@github.com:jgabriellima/aisdlc-astrojs.git
cd aisdlc-astrojs
npm install
```

### 2. Configurar Cursor

```sh
cp .env.example .env
# Edite .env e defina apenas CURSOR_API_KEY (Dashboard → Integrations)
```

**Não coloque `GITHUB_TOKEN` no `.env`.** PATs fine-grained costumam falhar ao criar branches (403). O wrapper em `scripts/ai-sdlc-cli.mjs` resolve o token via `gh auth token`.

### 3. Autenticar GitHub

```sh
gh auth login          # escopo repo
gh auth status         # confirmar conta jgabriellima (ou a sua)
```

### 4. Validar

```sh
npm run ai-sdlc:check-cursor
npm run ai-sdlc:health
npm run ai-sdlc:validate
```

Todos devem passar (check-cursor pode avisar sobre `CURSOR_API_KEY` se `.env` estiver vazio).

---

## Fluxo operacional (cada feature)

Use estes comandos na ordem. É o caminho documentado e testado neste repo.

### Passo 1 — Criar a issue

A pipeline exige label `ai-eligible` e critérios de aceite na descrição (quality gate `has-acceptance-criteria`).

```sh
gh issue create \
  --repo jgabriellima/aisdlc-astrojs \
  --title "feat: minha feature" \
  --label "ai-eligible" \
  --body "$(cat <<'EOF'
## Summary

Descreva o que deve ser implementado.

## Acceptance criteria

- [ ] Critério verificável 1
- [ ] Critério verificável 2
- [ ] `npm run build` passa
- [ ] Sem edits em `.github/workflows/**` ou `.ai-sdlc/**`

## Out of scope

O que NÃO fazer.
EOF
)"
```

O comando imprime a URL. Anote o número (ex.: `#3` → use `--issue 3`).

Se a label não existir ainda:

```sh
gh label create "ai-eligible" \
  --repo jgabriellima/aisdlc-astrojs \
  --description "Eligible for AI-SDLC pipeline" \
  --color "0E8A16"
```

### Passo 2 — Executar o pipeline

```sh
npm run ai-sdlc:run -- --issue 3
```

Substitua `3` pelo número real.

Etapas internas:

```text
validate  → gates (descrição + ACs)
code      → cursor-agent implementa na branch ai-sdlc/...
review    → gates pós-implementação
          → PR aberto no GitHub
```

Timeout do stage `code`: 30 min (`PT30M` em `.ai-sdlc/pipeline.yaml`).

Modelo Cursor opcional:

```sh
export AI_SDLC_CURSOR_MODEL=composer-2
npm run ai-sdlc:run -- --issue 3
```

### Passo 3 — Revisar o PR

```sh
gh pr list --repo jgabriellima/aisdlc-astrojs
gh pr view --web
```

Localmente:

```sh
git fetch origin
git checkout ai-sdlc/issue-3    # nome exato aparece no PR
npm install
npm run build
npm run dev                     # http://localhost:4321
```

### Passo 4 — Merge

```sh
gh pr merge --squash
git checkout main && git pull origin main
npm run build
```

---

## Exemplo concreto: blog engine (issue #1)

Issue e PR já existem neste repo como referência.

| Entregável | Caminho |
| --- | --- |
| Schema | `src/content/config.ts` |
| Posts | `src/content/blog/*.md` |
| Listagem | `src/pages/blog/index.astro` |
| Post | `src/pages/blog/[...slug].astro` |
| Home | link para `/blog` |

Para reprocessar a issue #1 (branch já existe — esperado 422 no create ref, pipeline continua):

```sh
npm run ai-sdlc:run -- --issue 1
```

---

## Alternativa sem pipeline

Se ainda não quiser GitHub no loop:

1. Abra o projeto no Cursor (MCP `ai-sdlc` em `.cursor/mcp.json`).
2. Cole a descrição da issue no Agent chat.
3. Valide: `npm run build && npm run dev`.

Depois abra PR manualmente ou crie issue e re-rode o pipeline.

---

## Comandos

| Comando | Quando usar |
| --- | --- |
| `npm run dev` | Servidor Astro local |
| `npm run build` | Build de produção |
| `npm run ai-sdlc:check-cursor` | Verificar Cursor CLI + MCP + `.env` |
| `npm run ai-sdlc:health` | Validar config `.ai-sdlc/` |
| `npm run ai-sdlc:validate` | Validar YAML contra JSON Schema |
| `npm run ai-sdlc:run -- --issue N` | **Fluxo principal** — implementar issue #N |
| `npm run ai-sdlc -- agents` | Roster de agentes / autonomia |
| `npm run ai-sdlc -- status` | Estado do pipeline |

Prefira `npm run ai-sdlc -- …` em vez do binário global `@ai-sdlc/orchestrator` (bug conhecido no symlink).

---

## Estrutura do projeto

```text
.ai-sdlc/           pipeline, gates, autonomy (não editar via agente)
.cursor/            MCP advisor, rules, context sources
.github/workflows/  CI gates (ai-sdlc/pr-ready)
scripts/            ai-sdlc-cli.mjs (Cursor runner + gh token)
src/                código Astro
```

---

## Troubleshooting

| Sintoma | Causa | Ação |
| --- | --- | --- |
| `403` em `git/refs` | PAT no `.env` sem permissão | Remova `GITHUB_TOKEN`/`GH_TOKEN` do `.env`; use `gh auth login` |
| `Authorization denied for astro.config.mjs` | ABAC level 0 só permitia `src/**` | Já corrigido em `autonomy-policy.yaml` — inclui configs na raiz |
| `No files were modified` | `cursor-agent` não alterou arquivos | Verifique `CURSOR_API_KEY`; teste `cursor-agent --print "…"` na branch |
| `422` em `git/refs` | Branch `ai-sdlc/issue-N` já existe | Normal em re-run; pipeline deve continuar |
| `CURSOR_API_KEY is required` | `.env` vazio ou ausente | Preencha `.env` a partir de `.env.example` |
| Gate `has-acceptance-criteria` | Issue sem ACs | Adicione checklist na descrição |
| Pipeline não dispara (watch) | Sem label | `gh issue edit N --add-label ai-eligible` |

---

## Referências

- [AI-SDLC Getting Started](https://ai-sdlc.io/docs/getting-started)
- [Runners (CursorRunner)](https://ai-sdlc.io/docs/api-reference/runners)
- [Astro docs](https://docs.astro.build)
