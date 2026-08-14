# Module Organization

This document defines product-agnostic source placement for monorepos and
single-package repositories. It applies to production source and its tests.

## Decide repository shape before source shape

A monorepo contains multiple declared package or application workspaces. A
single-package repository has one package boundary, even if its source contains
many modules.

Use package-manager workspace declarations, manifests, build graphs, and
independent publish or execution units as evidence. Do not classify a repository
as a monorepo merely because it has several top-level folders, and do not
classify it as single-package merely because it has one deployment.

When the evidence is ambiguous, ask before installing this architecture layer.
Do not create `apps/` or `packages/` just to make a repository resemble the
monorepo example.

Keep these questions separate:

- Is the repository a monorepo or single-package repository?
- Is the repository an application, library, tool, or mixed collection?
- Which workspaces, if any, deploy independently?
- Where does production source begin in each package boundary?
- Is adoption greenfield or a migration of existing structure?

## Use one production root per package boundary

Production code normally begins under a declared source root such as `src/`.
Package manifests, build configuration, generated metadata, lint configuration,
and package-local docs remain outside it.

`boundaries.config.mjs` declares each source root explicitly. The template does
not require `apps/` and `packages/` names; those are conventional monorepo paths,
not architecture.

## Give monorepo workspaces conceptual roles

An application workspace is a thin deployable shell. It owns startup,
environment integration, framework entrypoints, and composition. Product
behavior belongs in conceptual modules or conceptual package workspaces rather
than accumulating in the shell.

A package workspace should own a coherent product or application concept. A
package boundary is justified when that concept has a useful public interface
and a focused reason to change. Package names such as `database`, `api`,
`services`, `helpers`, or a framework name usually describe mechanisms, not
concepts.

Do not create one package per technical layer. Place adapters and technical
details inside the concept that owns their use.

A technical workspace is permitted only when an independent lifecycle,
deployment, security boundary, version contract, generated-code lifecycle, or
ownership constraint is already real. Mark it as
`documented-technical-exception` and record the reason. Convenience and possible
future reuse are not sufficient reasons.

## Make first-level source folders conceptual

First-level folders inside a source root are architectural modules. They should
name product concepts or, in an application shell, explicit application roles.

Good names let a reader answer what behavior or application responsibility the
module owns. Generic first-level folders such as `controllers`, `services`,
`repositories`, `models`, `components`, `helpers`, `utils`, `common`, or
`infrastructure` distribute one concept across technical buckets and are not the
default architecture.

Framework components, persistence adapters, request handlers, and schemas stay
inside their owning concept. A genuinely reused UI concept can become a module
after concrete reuse establishes one owner; a generic component bucket is not a
starting point.

Application-role modules such as navigation or runtime orchestration are valid
only when the role itself is a coherent application concept. A legacy or
generated technical first-level folder must be registered as a documented
technical exception with its concrete reason. Strict enforcement coverage must
not be achieved by pretending that a technical bucket is conceptual.

## Organize change paths as vertical slices

Second-level folders normally identify a use case, behavior, or focused change
path within the first-level module. A slice may contain handling, validation,
views, persistence, tests, and local helpers when those parts change together.

The goal is not identical folder shapes. The goal is to keep one behavior local
and preserve its conceptual flow.

When a slice implements one bounded process, command, pass, or workflow step,
prefer a primary file that makes the runtime story visible: gather inputs,
derive named values, branch on predicates, invoke operations, and return the
result. Extract lower-level helpers only when they clarify an instruction, have
independent meaning, or already face real reuse pressure.

## Keep public interfaces explicit

Every source directory that contains production files exposes an `index.*`
interface.

Index files contain only explicit named re-exports from sibling implementations
or child interfaces. They contain no wildcard exports, declarations, startup
logic, or side effects.

Cross-module dependencies use the target first-level module's index. Module
implementations do not import their own parent index. Internal imports within a
module may address focused implementation files directly.

Cross-workspace dependencies use the exact target package root. Relative
traversal into another workspace and undeclared package subpaths bypass the
public contract and are disallowed by default.

## Keep composition narrow

Source-root composition files such as `main.ts` or `main.tsx` may join multiple
public module interfaces because composition is their one responsibility. They
are declared individually in `boundaries.config.mjs` with explicit dependency
permissions.

Executable entrypoints focus on startup and wiring and do not double as public
export surfaces. If a framework requires a broader composition directory, model
it as an explicit application-role module or document a narrow destination
exception; do not let it become a second home for product behavior.

## Keep sharing owned and evidence-based

Shared code remains inside the narrowest concept that owns it. Extract it only
after multiple current callers demonstrate the same behavior and ownership.

Avoid repository-wide `shared`, `common`, `utils`, `helpers`, `base`, `core`, or
`platform` buckets. Small local duplication is preferable when it preserves
ownership and reduces blast radius.

## Keep dependency direction explicit and acyclic

Workspace and first-level module dependency graphs are allow-lists. An absent
edge is denied. Self-edges, unknown targets, and permitted cycles are invalid.

Composition may join multiple modules, but it does not grant those modules
dependencies on one another. External packages and Node.js core modules are
also explicit owner-level dependencies; proximity in a package manifest does
not make them architecturally available everywhere.

Remove a permission when its final use disappears. A stale permission describes
an architecture the code no longer needs and makes future coupling easier by
accident.

## Keep tests close to ownership

Put tests beside their module or slice when practical. Tests may use
same-workspace public module interfaces and explicit test-only providers. Tests
inside a module may also use that module's internals.

Production code never imports tests. If a tool requires a separate test tree,
adapt the test descriptors deliberately and preserve the same ownership model.

## Adopt existing repositories without laundering legacy structure

Greenfield repositories start with the target model and strict coverage.

For an existing repository:

1. Inventory manifests, source roots, deployable units, and actual imports.
2. Identify concepts from product docs and change history rather than folder
   names alone.
3. Register current conceptual modules and explicit dependency edges.
4. Mark unavoidable technical workspaces or modules as documented exceptions
   with concrete reasons.
5. Record the intended migration and remove exceptions and permissions as the
   corresponding legacy structure disappears.

Do not hide existing code with narrow production globs or disable unknown-file
checks. Coverage and architectural approval are different: strict coverage
should expose legacy structure while exception metadata states that it is not
the target design.

## Placement heuristic

Ask these questions in order:

1. Which repository package boundary owns this code?
2. Is that boundary a conceptual package, a deployable application shell, or a
   justified technical exception?
3. Does the code belong under the declared production root or beside it as
   configuration, tooling, generated metadata, or docs?
4. Which product concept or application role owns the behavior?
5. Which use case or change path keeps its collaborating details local?
6. What primary file makes the conceptual flow visible?
7. Is a proposed shared boundary supported by multiple current callers and one
   clear owner?
8. Is a proposed technical boundary required by a current independent
   lifecycle, security, deployment, generation, versioning, or ownership fact?
9. Does every new dependency appear explicitly in the canonical registry?

If conceptual ownership or a technical exception cannot be explained, keep the
code in its current narrow owner and investigate before creating a new
structural boundary.
