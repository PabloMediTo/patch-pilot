# Conceptual Simplicity

This document defines how the repository applies simplicity and complexity to
code, architecture, terminology, and documentation structure.

## Core stance

Simplicity means the absence of complecting.

Complexity means distinct concerns have been braided together behind one
boundary.

This repository applies that definition consistently. It does not treat
simplicity as a synonym for familiarity, convenience, or implementation
compactness.

## Easy is not simple

Something can be easy because it is familiar, nearby, or convenient to use.

That does not make it simple.

When deciding how to structure the system or the docs, prefer conceptual
simplicity over technical convenience.

## Scope of the rule

Apply this rule to:

- code modules
- architecture boundaries
- repository terminology
- documentation structure

## What counts as a module here

A module is anything with an inside, an outside, and a boundary or interface.

In this repository, a module may be:

- a function
- a class
- a namespace or package
- a service
- an application
- a documented system part

## Boundary rule

Each module, system part, and focused doc should own one concept, task, role,
or dimension.

Do not merge distinct responsibilities just because they:

- happen in sequence
- are implemented by the same code
- share a workflow
- are convenient to explain together

Operational adjacency is not conceptual identity.

## Compose at the top level

When unavoidable complexity has multiple parts, divide it into distinct
components and compose them at the top level.

Composition is allowed.

Complecting is not.

## Consequences for implementation

When implementation convenience conflicts with conceptual clarity, preserve
conceptual clarity.

This can mean:

- accepting more modules
- accepting some duplication
- avoiding broad abstractions that blur responsibilities

## Consequences for documentation

Docs are part of the design system for the repository.

Do not use one doc to hide multiple distinct concepts behind one convenient
title.

When an area has clear responsibility boundaries, prefer:

- one focused doc per system part
- one composition doc that explains how the parts fit together

over one umbrella doc that mixes responsibilities.

## Required shape for system-part docs

When documenting a system part, include these sections:

- `Responsibility`
- `Not responsible for`
- `Inputs`
- `Outputs`
- `Adjacent parts`

Add other sections only when they help without blending multiple concepts
together.

## Terminology rule

Use one important term per important concept.

Do not let near-synonyms or overloaded labels blur distinct boundaries.

Keep repository concepts distinct from the meta and internal terms used to
scope, design, implement, operate, or document them.

If terminology changes, update `docs/DICTIONARY.md`.

## Design test

When deciding whether a boundary is simple enough, ask:

- Does this part own one concept, role, task, or dimension?
- If I change this concern, can I reason about this part mostly in isolation?
- Am I merging concepts because they belong together, or because it is
  technically convenient?

If the answer shows interleaving of distinct concerns, the design is too
complex and should be decomposed further.
