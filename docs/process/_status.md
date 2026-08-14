# Process Status

Current reality:

- Global docs are routed through `docs/_index.md` and area `_index.md` files.
- The normal docs workflow now treats `README.md` as the mandatory human entrypoint in each docs folder.
- The docs process now explicitly routes conceptual-simplicity guidance for
  boundary, decomposition, terminology, and docs-structure tasks.
- The dictionary now separates repository concepts from meta/internal
  terminology instead of flattening both into one glossary section.
- The docs workflow now requires a dictionary coverage pass over an affected
  docs area after substantive docs changes, rather than only updating
  explicitly mentioned terms.
- Contradictions noticed during docs routing should be surfaced even when contradiction-finding was not explicitly requested.
- [Co-located docs](../DICTIONARY.md#co-located-docs) remain optional and conservative by default, and new ones are created manually rather than by a creator skill.

Known gaps:

- The process is defined, but only a small number of docs areas currently exist, so some folder-shape rules are established ahead of broader adoption.
