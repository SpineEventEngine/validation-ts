# Technical Baseline

## Purpose

`@spine-event-engine/validation` validates Protobuf-ES message instances at
runtime using Spine validation options documented in upstream Proto files.
It is an experimental TypeScript library; its public API is not stable.

## Current Public Surface

- `validate(schema, message)` returns constraint violations.
- `formatViolations(violations)` creates diagnostic text.
- `Violations.formatMessage()` and `Violations.failurePath()` extract
  presentation-friendly values.
- Public generated types include `ConstraintViolation`, `ValidationError`,
  `TemplateString`, and `FieldPath`.

The implemented option families are `required`, `pattern`, message-level
`require`, `min`, `max`, `range`, `distinct`, nested `validate`, `goes`, and
oneof `choice`.

## Contract Authority

The primary semantic source is the documentation embedded in:

- `https://github.com/SpineEventEngine/base-libraries/blob/master/base/src/main/proto/spine/options.proto`
- future extensions:
  `https://github.com/SpineEventEngine/time/blob/master/time/src/main/proto/spine/time_options.proto`

An intake resolves the moving upstream branch to an immutable commit and
records the raw URL, commit, retrieval date, local destination, and SHA-256.
Vendored Proto contents are immutable. Project code and tests may adapt around
them, but must not rewrite them to satisfy local style.

The JVM Validation implementation is not the default source for TypeScript
architecture. A task may use it for focused behavioral comparison only when
explicitly approved.

## Present Architecture

The package generates Protobuf-ES descriptors with ESM `.js` relative imports,
then applies a fixed sequence of modular option validators. Generated sources
are build artifacts and remain untracked. The generated `require` extension is
imported under the project-local alias `requireFields`; generator output is not
modified.

Known implementation debt is not silently fixed by the protocol bootstrap:

- recursion and regular-expression resource limits need explicit future
  analysis.

The public entry point keeps a generated descriptor and its matching message
shape paired at compile time. Its validator sequence and option registry are
internal fixed implementation details; public validator extensibility is not
supported.

Java regular-expression compatibility remains an explicit open question. The
frozen `(pattern)` documentation defines Java `Pattern.compile()` semantics,
while the current runtime delegates to ECMAScript `RegExp` and does not
implement equivalent full-match, dialect, or modifier behavior. Do not claim
full Java-pattern parity without a separately approved compatibility change.
See Q-0001 in `questions/UNRESOLVED.md`.

## Compatibility

- pnpm 11.9.0 is the package manager and its committed lockfile is the
  deterministic dependency graph.
- Vitest 4.1.9 with V8 coverage is the test runner.
- The published package is ESM-only and must be consumed through its export
  map; CommonJS `require()` is unsupported.
- Node.js 24 or later is required; 24.18.0 is pinned and tested.
- The package name is `@spine-event-engine/validation`.
- Snapshot versions use `2.0.0-snapshot.<increment>`.
- `master` pushes publish automatically; `dev` is the integration branch.
