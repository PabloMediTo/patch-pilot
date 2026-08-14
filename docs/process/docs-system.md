# Indexed Docs System

The repository documentation system separates:

- [global docs](../DICTIONARY.md#global-docs) under `docs/`
- optional [co-located docs](../DICTIONARY.md#co-located-docs) in `*.docs.md`
  files next to specific source or configuration files

Recommended ownership:

- `docs/_index.md`: root index file
- `docs/<area>/_index.md`: local index file
- `docs/**/README.md`: mandatory human mental-model entrypoint for each docs folder
- `docs/**/_status.md`: optional present-state doc for current reality, active uncertainty, known gaps, or open questions
- `docs/**/_decisions.md`: optional rationale doc for important choices and tradeoffs
- `docs/DICTIONARY.md`: canonical repository terminology dictionary for the repository's docs tree
- topic docs under `docs/`: global canonical facts
- `<file>.docs.md`: optional local documentation for one concrete file or module

Conceptual-simplicity rules:

- preserve conceptual simplicity when choosing doc boundaries
- do not broaden one doc to cover multiple distinct responsibilities just because they are adjacent in workflow or implemented together
- prefer one focused doc per responsibility or system part plus a composition doc that explains how the parts fit together
- treat docs structure as part of the system design, not just as explanatory prose

System-part doc shape:

- `Responsibility`: what the part owns
- `Not responsible for`: what adjacent parts own instead
- `Inputs`: what comes into the part
- `Outputs`: what leaves the part
- `Adjacent parts`: which neighboring parts it composes with

Routing contract entry shape for global docs:

- heading: document title
- `Path`: canonical path to the doc
- `Summary`: short explanation of what the doc is about
- `Read when`: explicit instructions for when the doc should be read
- `Tags`: a few concise routing tags

Global docs maintenance rules:

- update the canonical document that owns the changed fact
- keep `README.md` present in every docs folder under `docs/`, even if it is only a few lines long
- keep `README.md` focused on what the area is, why it exists, and the core mental model humans should use when reading it
- add or update `_status.md` when the area has meaningful current-state volatility, active uncertainty, known gaps, or open questions
- add or update `_decisions.md` when rationale or tradeoffs would not be obvious from the current docs shape alone
- add a new focused doc only when no current doc is a good fit
- preserve conceptual simplicity when choosing doc boundaries
- do not broaden one doc to cover multiple distinct responsibilities just because they are adjacent in workflow or implemented together
- when an area has multiple clear responsibility boundaries, prefer one focused doc per responsibility or system part plus a composition doc
- when a global doc changes, check the co-located `_index.md` first
- then walk upward one folder at a time toward `docs/_index.md`
- update or create parent routing `_index.md` files only where routing or discoverability changed
- ensure each `_index.md` entry for an existing global doc includes `Path`, `Summary`, `Read when`, and `Tags`
- stop once the next parent `_index.md` would not need any change
- update `docs/DICTIONARY.md` when important repository terms are introduced, renamed, redefined, or removed
- after substantively changing docs in an area, do a dictionary coverage pass over the affected docs so stable terms now relied on by those docs are present in `docs/DICTIONARY.md`, linked where important, and stripped of stale removed-term links

Global docs reading rules:

- route through `docs/_index.md` first when global docs are needed
- treat `_index.md` as navigation, `README.md` as the human entrypoint, `_status.md` as present-state context, `_decisions.md` as rationale, and topic docs as focused mechanisms or rules
- read an area's `README.md` when you need to understand what the area is, why it exists, or how its docs are meant to be interpreted
- read an area's `_status.md` when current reality or active uncertainty matters
- read an area's `_decisions.md` when rationale or tradeoffs matter
- read only the minimum sufficient set of global docs
- if routing or reading reveals a meaningful contradiction or mismatch, surface it clearly even when contradiction-finding was not the user's primary request
- when a focused doc explicitly documents a system part, use the standard `Responsibility`, `Not responsible for`, `Inputs`, `Outputs`, and `Adjacent parts` sections

Co-located docs maintenance rules:

- when a concrete source or configuration file changes, check whether an adjacent co-located docs file exists
- if it exists and the change affects documented behavior, interface, intent, invariants, or constraints, update it in the same task
- if it does not exist, do not create one as part of normal maintenance
- new co-located docs are created manually and only when explicitly requested
- co-located docs do not participate in `docs/_index.md` routing or `_index.md` propagation
