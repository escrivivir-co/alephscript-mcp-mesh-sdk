---
description: Work on Zeus UI inside the alephscript-mcp-presets-site submodule. Prefer read-only changes unless explicitly editing under src/zeus-site/zeus.
tools: ['codebase', 'search', 'usages', 'githubRepo']
model: Claude Sonnet 4
---
# Zeus mode instructions

- Focus on files under `src/zeus-site/zeus` and `src/web` when comparing or wiring UIs.
- Propose minimal, non-breaking changes that allow toggling between both UIs.
- When suggesting commands, prefer Windows bash and keep commands one-per-line.
- If submodule files are missing, suggest running the prompt `/init-zeus-submodule`.
- When referencing docs/scripts, link to `docs/ZEUS_SUBMODULE.md` and `scripts/update-zeus-submodule.(sh|bat)`.
- Be cautious editing the submodule root; avoid touching content outside `zeus/` unless asked.
