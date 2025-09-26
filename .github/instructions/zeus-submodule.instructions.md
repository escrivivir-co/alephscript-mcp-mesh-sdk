---
description: Instructions for handling the local Zeus submodule
applyTo: "src/zeus-site/**"
---
# Zeus submodule handling

- Treat `src/zeus-site` as a Git submodule.
- Use relative URLs in `.gitmodules` and avoid hardcoding absolute paths.
- When needing the zeus UI, reference files under `src/zeus-site/zeus`.
- To update submodule: run `scripts/update-zeus-submodule.(sh|bat)`.
- Use sparse-checkout to load `zeus/` only: `git -C src/zeus-site sparse-checkout set zeus/`.
- Do not rewrite files outside the `zeus/` folder in the submodule unless explicitly asked.
