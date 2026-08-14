# Architecture Principles

These principles constrain code, docs, and enforcement rules.

## Conceptual simplicity beats technical convenience

Simplicity means distinct concerns are not braided together behind one boundary.

Do not treat familiarity, proximity, or compact implementation as simplicity.

Preserve clear responsibility boundaries even when combining concerns would be
technically convenient.

## Compose distinct parts at the top level

Distinct parts should be joined by explicit composition rather than hidden
behind a broad mixed responsibility.

Composition belongs at the boundary where the reader expects multiple parts to
come together.

## One boundary should own one concept

Each module, directory, package, function, class, focused document, or automated
check should own one concept, role, task, or dimension.

Do not merge distinct responsibilities because they happen in sequence, share a
workflow, use the same tool, or are easy to explain together.

Operational adjacency is not conceptual identity.

A sequence can still be one concept when the sequence is the thing the boundary
owns.

A function or file that composes several named steps is not complex merely
because those steps happen in order. It becomes complex when it owns multiple
independent policies, unrelated reasons to change, or hidden side effects that
cannot be understood from the flow.

## Treat modules as boundaries

A module is anything with an inside, an outside, and an interface.

In this template, a module may be a function, class, directory, package,
application, service boundary, documented system part, or automated check.

The same simplicity rule applies at each scale: keep one concept, task, role, or
dimension behind each boundary.

## Let concepts determine structural boundaries

Repository structure should follow the product and application concepts that
give code one coherent reason to change.

A package, workspace, or first-level source module should not exist merely
because code uses the same framework, data store, transport, protocol, or
technical pattern. Keep those mechanisms inside the concept that owns them.

Application workspaces may form deployable composition shells, and application
source roots may contain explicit application roles. These are still meaningful
boundaries, not generic technical buckets.

Create a technical structural boundary only for a concrete independent
lifecycle, deployment, security, versioning, generation, or ownership
constraint. Name and document it as an exception so it does not quietly become
the default organizing principle.

## Prefer late extraction over early abstraction

Create shared abstractions only after repeated concrete use proves that the
behavior is truly shared and has one clear owner.

Surface similarity is not enough.

Small local duplication is acceptable when it preserves ownership, narrows
context, and reduces blast radius.

Use these questions before extracting shared code:

- Which existing concrete call sites already need the same behavior?
- What repeated change pressure is being reduced now?
- Who owns the abstraction after it is extracted?
- Does the extraction reduce current blast radius without broadening the
  boundary?

If the answers are weak, keep the logic local and delay the abstraction.

## Optimize only for real constraints

Do not distort module boundaries, runtime shape, data flow, or ownership for
speculative scale or performance concerns.

Performance-motivated structure needs a real bottleneck, measured cost, or
already-documented constraint.

Until then, optimize for clarity, reversibility, and narrow ownership.

Use these questions before adding performance-oriented structure:

- What real bottleneck, operational limit, or measured cost exists now?
- Which documented constraint requires this shape?
- Which boundary owns the optimization?
- Does the optimization preserve local reasoning?

If the answers are speculative, keep the simpler structure.

## Documentation should preserve boundaries

Architecture docs are part of the architecture.

Do not use one document to hide multiple distinct concepts behind one convenient
title.

When an area has clear responsibility boundaries, prefer focused docs for each
responsibility plus a composition doc that explains how those responsibilities
fit together.

Use one important term for one important concept. Avoid near-synonyms and
overloaded labels that blur boundaries.

## Source should stay machine-legible

Agentic development works better when files are small, imports are explicit,
interfaces are searchable, and dependency direction is mechanically visible.

Architecture rules should preserve local reasoning.

The reader should be able to understand what a file owns, what it exports, and
which boundary it depends on without reconstructing hidden conventions.

## Enforcement is part of the architecture

Review-only architecture rules drift.

Rules that can be checked mechanically should be checked by the smallest
appropriate enforcement surface. For JavaScript and TypeScript source layout
and dependency relationships, this template uses ESLint.

Mechanical checks should explain and reinforce the documented architecture
rather than becoming a second undocumented rulebook.

Do not add parallel custom enforcement because a future gap might exist. Add a
narrow additional mechanism only when a real, documented rule cannot be
observed by the existing enforcement.
