# JavaScript And TypeScript Conventions

This document defines repository-wide implementation conventions for JavaScript
and TypeScript source files.

It layers on top of [module-organization.md](module-organization.md).

## Prefer data over classes

Represent pure information with built-in language data constructs such as
primitives, arrays, records, maps, and plain objects.

Do not use classes for pure information.

Use classes only when a module owns a stateful resource or imperative adapter
such as a database connection, WebSocket connection, subprocess manager, file
watcher, or similar long-lived boundary.

When a class is warranted, mark it with `@statefulResource` or
`@imperativeAdapter` in the class JSDoc so the exception stays explicit to
humans and automation.

## Keep filenames aligned with primary exports

When a file exists to export one primary component, class, or function, the file
name should match that entity.

Examples:

- `UserAvatar` belongs in `UserAvatar.jsx`
- `queryKeyFactory` belongs in `queryKeyFactory.js`
- `createWorkflowStepPacket` belongs in `createWorkflowStepPacket.ts`

Interface files such as `index.js`, executable entrypoints such as `main.js`,
and responsibility-named data or configuration files are explicit exceptions.

## Prefer instruction-shaped functions

Non-trivial application functions should usually read like short instruction
sets.

Prefer functions that:

- call named operations
- assign intermediate results to meaningful names
- use predicate-named booleans for branches
- keep loops and conditional statements visible when they are part of the
  concept
- return the final composed result

Avoid hiding the main story behind clever point-free composition, generic helper
layers, or prematurely extracted micro-functions.

Example:

```js
function runPass(input) {
  const preparedInput = prepareInput(input);
  const result = executePass(preparedInput);

  const hasBlockingProblem = doesResultHaveBlockingProblem(result);
  const resolvedResult = hasBlockingProblem
    ? createBlockedResult(result)
    : createCompletedResult(result);

  return formatPassResult(resolvedResult);
}
```

Lowest-level functions may be direct and imperative when they own one simple
task such as parsing, filesystem access, HTTP calls, schema validation,
formatting, adapter calls, or mutation of one known boundary.

Higher-level functions should compose those operations instead of mixing
low-level mechanics into the conceptual flow.

## Boolean names should read like predicates

Boolean variables and boolean-returning functions should start with a
present-tense `is` or `has` form when the value is mechanically identifiable as
boolean.

Prefer names such as `isVisible`, `hasAccess`, `isProcessing`, and `hasError`.

## Module-scope functions should have JSDoc

Module-scope named functions should have a JSDoc block.

Document `@param`, `@returns`, and `@throws` when they apply.

Describe behavior in plain language for readers who do not already know the
implementation.

This applies to production functions and named test helper functions.

## Prefer named exports

Use named exports by default.

Named exports make imports easier to search, rename, and trace during
agent-driven refactors.

Default exports are allowed only when a framework or tool requires them, and the
exception should be explicit in ESLint config or local docs.
