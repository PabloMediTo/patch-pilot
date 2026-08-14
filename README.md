# Private Projekte Monorepo

Greenfield npm monorepo with docs-driven development and explicit architecture enforcement.

The repository combines:

- the Docs-Driven Product Development workflow
- architecture philosophy and ESLint boundary enforcement
- npm workspace locations under `apps/*` and `packages/*`

No product workspace is created yet. Add real applications and conceptual packages only when their responsibilities are known, and register them in `boundaries.config.mjs`.

Run `npm install` once to install the development dependencies, then use `npm run check` for lint and architecture tests.

## Markplane

Markplane stores project-management data as version-controlled Markdown under `.markplane/`. The Windows CLI is installed locally under the ignored `.tools/markplane/` directory.

Useful commands:

```powershell
npm run markplane:check
npm run markplane:sync
npm run markplane:serve
```

Use `npm run markplane -- --help` for the complete CLI reference. A fresh checkout must install the Markplane binary separately because local tools are not committed.

---

## Template documentation

- [What This Template Is For](#what-this-template-is-for)
- [How To Set Up](#how-to-set-up)
- [How To Use This Workflow](#how-to-use-this-workflow)
- [Technical Documentation](#technical-documentation)

## What This Template Is For

This template gives you an **easy starting point** for docs-driven product development (DPD).
You'll get a reusable documentation workflow that you can copy into your own repository and adapt from there.

- **Agents discover relevant docs**
- **Agents maintain docs system**
- **Engineers remain in control over what to add and when**

## How To Set Up

For Codex:

- add the contents of `AGENTS.md` to your repository's `AGENTS.md`, or copy the file if you do not already have one
- copy the `docs/` directory into the target repository
- copy `.agents/skills/` into the target repository
- copy the contents of `.codex/config.toml`
- copy `.codex/profiles/repo-analyst.md` into your `.codex/profiles`

This setup gives the destination repository the DPD documentation model, the Codex activation rules, and the Codex-specific workflow implementation.

Recommended target layout in the destination repository:

```text
<repo>/
  AGENTS.md
  docs/
  .agents/skills/
  .codex/config.toml
  .codex/profiles/repo-analyst.md
```

What each copied part does:

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Contains the always-on repository rules. |
| `docs/` | Contains the canonical shared DPD workflow documentation. |
| `.agents/skills/` | Contains the operational skills that implement the workflow. |
| `.codex/config.toml` | Registers the reusable `repo-analyst` profile. |
| `.codex/profiles/repo-analyst.md` | Defines the analytical reading behavior for deep repository understanding and contradiction-finding. |

## How To Use This Workflow

### tl;dr

- You decide which docs to add, when to add docs and how (manually, automated workflows, etc)
- The workflow then helps the agent consistently
  - route through the relevant docs
  - maintain the docs system
  - keep documentation aligned with repository truth.

---

This workflow is not fully automatic by itself. It gives the agent a structured documentation system and clear maintenance rules, but users still need to define the repository's actual documentation content and boundaries.

What users need to do:

- define which global docs areas should exist under `docs/`
- define which topic docs should be added as the repository grows
- decide what belongs in global docs versus co-located `*.docs.md` files
- define the repository's actual terminology in `docs/DICTIONARY.md` once stable terms exist
- make explicit when new workflow conventions or product concepts should become canonical documentation
- create new co-located docs manually and explicitly when they are warranted; the workflow will not generate them for you

What the workflow automates for Codex once those structures exist:

- routing through global docs for every substantive prompt
- reading only the minimum sufficient set of global docs by default
- checking for adjacent co-located docs when concrete files are read
- updating existing co-located docs when the documented file changes in a relevant way
- maintaining `_index.md` routing integrity when global docs change
- maintaining `README.md` as the human mental-model entrypoint in each docs folder
- maintaining `_status.md` and `_decisions.md` when current-state or rationale information changes
- maintaining `docs/DICTIONARY.md` when important repository terminology is introduced, changed, or removed
- proactively surfacing meaningful contradictions noticed while routing or reading docs

In practice, the workflow works best when users treat documentation structure as part of repository design. The automation keeps the system coherent, but it does not decide the repository's product model or documentation scope on its own.

## Technical Documentation

This section describes the full structure of the current repository and how the workflow is wired.

Rules for this root `README.md`:

- there should be a Table of Contents directly under the `h1`, without its own headline
- the top Table of Contents should include only this document's top-level `h2` sections
- the Table of Contents should not list any subheadings from within Technical Documentation
- the Technical Documentation section should describe the structure in depth and be exhaustive enough to cover:
  - the intention of every file
  - which files are shared across all agents
  - which files are agent-specific and, when relevant, which agents they belong to
  - the wiring of how the different agents implement the DPD workflow

### High-Level Structure

The repository has three layers:

1. Shared workflow rules in `docs/`
2. Agent activation rules in `AGENTS.md`
3. Codex-specific implementation files in `.agents/` and `.codex/`

The intended split is:

- `docs/` defines the canonical workflow model
- `AGENTS.md` makes the workflow mandatory for this repository
- Codex-specific files implement Codex-native behavior on top of the shared model

### File Inventory And Intent

#### Shared Workflow Layer

These files are intended to be reusable regardless of agent vendor.

`docs/_index.md`

- Root navigation file for the global docs tree.
- First routing entrypoint when global docs are needed.
- Defines the top-level docs areas and when each should be read.

`docs/README.md`

- Human mental-model entrypoint for the `docs/` tree.
- Explains what the documentation system is for.

`docs/_status.md`

- Present-state doc for the root docs area.
- Captures what is true now, what is still unsettled, and current gaps.

`docs/_decisions.md`

- Rationale doc for the root docs area.
- Explains why the docs system is shaped the way it is when that is not obvious from the file tree alone.

`docs/DICTIONARY.md`

- Canonical repository terminology dictionary for this repository's own docs.
- Keeps repository language consistent, linkable, and centrally maintained.

`docs/process/_index.md`

- Navigation file for the process docs area.
- Routes readers to the specific process documents that define the DPD workflow.

`docs/process/README.md`

- Human mental-model entrypoint for the process docs area.
- Explains what the process area covers and how the documents in it fit together.

`docs/process/_status.md`

- Present-state context for the process area.
- Records what parts of the process are active and which parts are still only lightly exercised.

`docs/process/_decisions.md`

- Rationale for the process docs area.
- Explains why routing, status, and rationale are separated.

`docs/process/docs-routing.md`

- Defines the routing model for global docs.
- Establishes `_index.md` as navigation, `README.md` as the human entrypoint, `_status.md` as current-state context, `_decisions.md` as rationale, and topic docs as focused mechanisms or rules.

`docs/process/docs-system.md`

- Defines the overall documentation system.
- Explains the split between global docs under `docs/` and optional co-located docs in `*.docs.md`.
- Defines maintenance expectations for routing, dictionary updates, and doc ownership.

`docs/process/colocated-docs.md`

- Defines the naming, purpose, and constraints for co-located `*.docs.md` files.
- Establishes that co-located docs are optional and discovered by adjacency rather than global routing.

`docs/process/transitional-docs.md`

- Defines how to work safely when a repository has not fully adopted the indexed docs model.
- Exists so the workflow can be applied incrementally in less normalized repositories.

These files are shared because they define the DPD model itself rather than any Codex-specific mechanism.

#### Codex Activation Layer

`AGENTS.md`

- Declares the always-on repository rules that activate the workflow for Codex.
- Routes detailed policy into `docs/process/` instead of duplicating it locally.
- Tells the agent when to invoke the routing, dictionary, and co-located docs skills.

This file is explicitly wired to Codex skills by name:

- `global-docs-router`
- `global-docs-maintainer`
- `business-dictionary-maintainer`
- `colocated-docs-reader`
- `colocated-docs-maintainer`

#### Codex-Specific

`.agents/skills/global-docs-router/SKILL.md`

- Codex operational skill for deciding whether global docs are needed and, if they are, reading the minimum sufficient set.
- Implements proactive contradiction surfacing during routing.

`.agents/skills/global-docs-maintainer/SKILL.md`

- Codex operational skill for maintaining canonical docs and `_index.md` routing integrity when repository truth changes.

`.agents/skills/business-dictionary-maintainer/SKILL.md`

- Codex operational skill for maintaining `docs/DICTIONARY.md` as the canonical terminology file.

`.agents/skills/colocated-docs-reader/SKILL.md`

- Codex operational skill for checking whether a concrete file has an adjacent `*.docs.md` file and reading it when relevant.

`.agents/skills/colocated-docs-maintainer/SKILL.md`

- Codex operational skill for updating an existing adjacent `*.docs.md` file when the documented file changes.

`.codex/config.toml`

- Codex configuration file.
- Registers the reusable `repo-analyst` profile.
- Currently pins that profile to `gpt-5.4`.

`.codex/profiles/repo-analyst.md`

- Codex profile instructions for analytical work.
- Expands the default reading behavior to lower omission risk.
- Optimizes for repository understanding, contradiction-finding, and broad context gathering instead of minimal implementation-oriented routing.

### DPD Workflow Wiring

The current DPD wiring for Codex works like this:

1. The repository-level trigger lives in `AGENTS.md`.
2. `AGENTS.md` requires global docs routing for every substantive prompt.
3. `AGENTS.md` requires co-located doc checks when concrete files are read or modified.
4. `AGENTS.md` requires docs maintenance behavior when files under `docs/` or term definitions change.
5. The actual operational behavior is implemented by the Codex skills in `.agents/skills/`.
6. Those skills read the canonical rules from `docs/` and apply them to the current task.
7. For deep analysis tasks, `.codex/config.toml` exposes the `repo-analyst` profile, which uses `.codex/profiles/repo-analyst.md` to widen the reading strategy beyond the default conservative router behavior.

That means the wiring is intentionally layered:

- `docs/` defines the workflow
- `AGENTS.md` enforces the workflow
- `.agents/skills/` executes the workflow in Codex
- `.codex/profiles/repo-analyst.md` provides an alternate Codex reading mode for analytical tasks

### Relationship Between Global Docs And Co-Located Docs

The repository uses two documentation scopes:

- global docs under `docs/`
- optional file-specific docs in `*.docs.md`

Global docs are for:

- cross-cutting workflow rules
- canonical process definitions
- shared terminology
- repository-wide discoverability

Co-located docs are for:

- one concrete source or configuration file
- non-obvious local intent
- important invariants or boundary expectations
- file-specific guidance that would be too narrow for global docs

The two systems are intentionally separate:

- global docs participate in `_index.md` routing
- co-located docs are discovered only by adjacency
