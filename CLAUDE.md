# Project instructions

<!-- ai-sdlc:recommendation-pointer -->
## AI-SDLC quality gate

This repo is bootstrapped with the AI-SDLC framework. The single PR-ready
merge gate is `ai-sdlc/pr-ready` (see `.github/workflows/ai-sdlc-gate.yml`).

**Runtime:** Cursor (`cursor-agent`). Set `CURSOR_API_KEY` before pipeline runs.
Verify with `npm run ai-sdlc:check-cursor` and `npm run ai-sdlc:health`.
See `README.md` and `.cursor/rules/ai-sdlc.mdc` for operator guidance.
<!-- end ai-sdlc:recommendation-pointer -->
