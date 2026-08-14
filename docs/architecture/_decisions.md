# Architecture Decisions

## Architecture rules have their own area

Architecture rules are distinct from product truth and documentation workflow.
`docs/architecture/` owns source organization, dependency direction,
implementation conventions, and their enforcement without mixing them into
product or process docs.

## Topology is detected, not assumed

The template supports a monorepo and a single-package repository. “Single
package” is the precise contrast used here: both shapes still have one Git
repository, but only the monorepo contains multiple package or application
workspaces.

Workspace declarations, package manifests, and independent build or publication
units are stronger evidence than folder names. An adoption agent must ask when
the evidence is ambiguous because selecting a topology changes paths, roles,
and enforcement coverage.

Topology does not answer the repository's product role, whether a workspace is
deployed, or whether adoption is greenfield or a migration. Those decisions stay
explicit and separate.

## Structural boundaries represent concepts

A workspace or first-level source folder has a high coordination cost. It must
therefore represent a product concept, an application concept, or an explicit
application role—not merely a framework, data store, transport, or code kind.

Applications are the exception at workspace level because deployment needs a
composition shell. They remain thin and depend on conceptual packages instead
of becoming alternate homes for the same product behavior.

Some technical boundaries are real. Independent generation, security,
versioning, deployment, lifecycle, or ownership can justify one, but the
registry must label it as an exception and preserve the concrete reason. This
keeps migration coverage honest without redefining technical buckets as
concepts.

## One executable registry is canonical

`boundaries.config.mjs` contains the facts from which ESLint policies are
generated. A single map prevents workspace-local copies, docs, and lint rules
from disagreeing.

Docs explain vocabulary, rationale, and exceptions. They do not reproduce the
edge table. The executable registry is easy for agents to inspect and update,
while validation rejects unknown fields, references, duplicate identities,
wildcard providers, disguised internal packages, and dependency cycles.

## ESLint replaces the generic fitness checker

The earlier standalone architecture-fitness layer duplicated import and source
layout knowledge already expressible through `eslint-plugin-boundaries`.
Maintaining two models created drift and custom-code cost.

The template now translates its small registry into the plugin's canonical
`boundaries/dependencies` model and tests that translation. The adapter validates
template-specific shorthand but does not reimplement import parsing, resolution,
or selector matching.

ESLint is not declared universally complete. A destination repository may add a
narrow mechanism for an observed and documented blind spot, such as a runtime or
non-code relationship ESLint cannot see. It should not recreate a general
parallel boundary checker preemptively.

## Strict coverage and explicit providers are defaults

Broad production globs intentionally include potential workspace and source
locations, while element descriptors include only declared workspaces and
modules. Consequently, a new unregistered boundary is an error instead of an
unenforced island.

External and Node.js core dependencies are owner-level permissions. Allowing all
third-party providers everywhere would leave a major part of the dependency
graph implicit and would make unwanted coupling invisible.

Permissions are current architectural facts, not permanent entitlements. A
change that removes the final use of an edge should remove the edge from the
registry.

## Greenfield and migration use the same target with different sequencing

Greenfield repositories start with strict coverage. Existing repositories first
inventory current source roots, concepts, dependencies, and justified technical
exceptions. Migration exceptions remain explicit and should be retired as code
moves; strictness is not weakened globally to hide legacy structure.

## Documentation and enforcement change together

Principles explain why, module organization defines placement, the boundary doc
defines the registry contract, language conventions define file shape, and the
ESLint doc defines mechanical behavior. Tests are executable proof.

When a rule or model changes, the smallest relevant docs, registry, adapter, and
tests change together so none becomes a second undocumented architecture.
