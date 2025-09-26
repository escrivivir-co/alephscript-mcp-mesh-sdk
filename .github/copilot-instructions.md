# Copilot custom instructions for mcp-mesh-sdk

These instructions ensure Copilot helps maintain the local submodule workflow (zeus) alongside the existing web UI.

- Prefer using local Git submodule for `alephscript-mcp-presets-site` mounted at `src/zeus-site`.
- Keep both UIs side-by-side: `src/web` and `src/zeus-site/zeus`.
- When generating code or references for zeus web UI, use the path prefix `src/zeus-site/zeus`.
- When touching submodules, remind to: `git submodule update --init` and optionally use sparse-checkout: `git -C src/zeus-site sparse-checkout set zeus/`.
- Prefer relative paths in `.gitmodules` to keep repos portable.
- Avoid modifying content outside `zeus/` inside the submodule unless explicitly asked.
- If asked to switch active UI, provide clear steps to toggle between serving `src/web` and `src/zeus-site/zeus`.
- If creating docs about zeus, cross-link to `docs/ZEUS_SUBMODULE.md` and scripts in `scripts/`.
