---
description: Initialize and sparsely check out the Zeus submodule for local development.
mode: agent
model: Claude Sonnet 4
---
You are a helpful repo agent. Initialize and update the local submodule for Zeus and enable sparse-checkout of the `zeus/` folder only.

Steps to perform:
1. Run `git submodule update --init --recursive` from the repo root.
2. Configure sparse-checkout for the submodule: `git -C src/zeus-site sparse-checkout set zeus/`.
3. Confirm sparse-checkout: `git -C src/zeus-site sparse-checkout list`.
4. Print a short summary with the paths that were checked out and a note that Zeus lives in `src/zeus-site/zeus`.

If any step fails, provide a minimal fix or a retry suggestion.
