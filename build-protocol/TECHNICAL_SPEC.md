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

The package generates Protobuf-ES descriptors, then applies a fixed sequence of
modular option validators. Generated sources are build artifacts and remain
untracked. A post-generation compatibility patch currently renames the
generated `require` extension to `requireFields`.

Known implementation debt is not silently fixed by the protocol bootstrap:

- `any` appears at descriptor and message boundaries;
- the validator sequence is fixed despite older extensibility wording;
- generated-code patching is coupled to generator output;
- recursion and regular-expression resource limits need explicit future
  analysis.

Java regular-expression compatibility is an explicit open question. The
frozen `(pattern)` documentation defines Java `Pattern.compile()` semantics,
while the current runtime delegates to ECMAScript `RegExp` and does not
implement equivalent full-match, dialect, or modifier behavior. T-0002 must
not add a regex dependency, create a project-owned Java-pattern engine, or
claim full pattern parity. See Q-0001 in `questions/UNRESOLVED.md`.

Each item requires a separately approved task unless correction is necessary
to make the T-0001 verification baseline truthful.

## Compatibility

- npm remains the package manager for T-0001.
- Jest remains the test runner for T-0001.
- The published package remains CommonJS for T-0001.
- The package name is `@spine-event-engine/validation`.
- Snapshot versions use `2.0.0-snapshot.<increment>`.
- `master` pushes publish automatically; `dev` is the integration branch.
