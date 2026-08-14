# Process Decisions

## Separate Routing From Explanation

`_index.md` exists to support routing and discoverability. `README.md` exists to help a human understand the area. Keeping those roles separate makes each file easier to maintain.

## Keep Status And Rationale Out Of `README.md`

`_status.md` and `_decisions.md` isolate information that changes for different reasons than the core mental model. This avoids turning `README.md` into a mixed-purpose document.

## Keep One Global Dictionary

The repository uses `docs/DICTIONARY.md` instead of per-folder glossaries so terminology stays centralized and easier to keep consistent.

## Split Dictionary Terms By Conceptual Role

The repository keeps one global dictionary, but it does not flatten repository
concepts and meta/internal terminology into one undifferentiated list.

The dictionary uses a section for repository concepts and a section for
meta/internal terms so both kinds of terms can stay canonical without blurring
what belongs to the documented domain model itself.

## Dictionary Coverage Requires An Area Pass

Updating only the terms explicitly mentioned in a prompt is not enough once a
docs area relies on a broader stable vocabulary.

After substantively changing docs in an area, the workflow should scan that
affected area for stable terms now relied on repeatedly, add missing dictionary
entries that meet the criteria, link important uses, and remove stale links to
removed entries.

## Preserve Conceptual Simplicity Across Docs And Implementation

The repository treats conceptual simplicity as more important than technical or
editorial convenience.

Docs should not merge distinct responsibilities just because they are adjacent
in workflow or convenient to explain together. The same rule should guide
implementation boundaries.

## Let Docs Mirror Responsibility Boundaries

When an area has clear conceptual parts, the docs should use one focused
document per responsibility or system part plus a separate composition document
rather than one umbrella document that mixes responsibilities.

This keeps the docs usable as a design aid rather than only as prose.

## Keep Co-Located Doc Creation Manual

Creating new [co-located docs](../DICTIONARY.md#co-located-docs) changes the
repository's documentation shape.

That is a design choice, not routine maintenance.

The workflow may discover and maintain existing `*.docs.md` files, but it
should not create new ones automatically.

This keeps file-local docs explicit and avoids low-value documentation churn.
