# Docs Status

The repository is using the indexed docs model under `docs/`.

Current reality:

- `_index.md` is the navigation layer.
- `README.md` is the human mental-model entrypoint for each docs folder.
- `_status.md` and `_decisions.md` are now part of the folder-level docs shape when their information is needed.
- `docs/DICTIONARY.md` is the canonical terminology file for this template's own docs and should be adapted as destination repositories grow their own stable terminology.
- `docs/architecture/` defines the architecture model for the greenfield monorepo.
- `boundaries.config.mjs` is the canonical executable registry for future workspaces, modules, and dependency permissions.
- Three deployable application workspaces and the conceptual maintenance package are registered and bootstrapped with tested public interfaces; only local composition edges exist.
- Markplane 0.1.2 manages version-controlled project work under `.markplane/`; its generated indexes and context summaries remain untracked and are regenerated with `npm run markplane:sync`.
- Markplane includes the canonical `docs/` tree when generating project context.
- `docs/product/` defines the Autonomous GitHub Maintainer product and its MVP boundaries.
- Product implementation has not started; the first delivery epics and tasks are tracked in Markplane.

Open questions:

- Destination repositories still need to decide which template workflow terms to keep, rename, or replace with their own repository vocabulary.
- The repository role, deployment units, and conceptual workspace boundaries remain open until the first concrete project is added.
