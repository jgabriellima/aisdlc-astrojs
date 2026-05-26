# `.cursor/` — Cursor IDE integration

Project-local Cursor configuration for AI-SDLC orchestration with Cursor as the agent runtime.

| File | Role | Entry point |
| --- | --- | --- |
| `mcp.json` | MCP server registry (`@ai-sdlc/mcp-advisor`) | Cursor MCP panel |
| `settings.json` | Context sources + rule auto-attach | Cursor project settings |
| `rules/ai-sdlc.mdc` | Always-on AI-SDLC + Astro constraints | Cursor agent sessions |

See `README.md` at repo root for bootstrap and verification commands.
