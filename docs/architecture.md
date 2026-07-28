# Architecture and navigation

## Map

| Area                               | Responsibility                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/validation/src/index.ts` | Deliberately small public API and type exports.                                       |
| `validation.ts`                    | Entry point, root descriptor registry, formatting helpers, fixed orchestration.       |
| `validation-contract.ts`           | Shared root type, field-path, packed value, template envelope, and reflective reader. |
| `options/`                         | One option family per module; each adds data violations or configuration errors.      |
| `presence.ts`                      | Shared descriptor-aware presence rules.                                               |
| `options-registry.ts`              | Maps canonical option names to generated extensions.                                  |
| `packages/validation/proto/`       | Immutable upstream contract inputs plus project-owned supporting Proto files.         |
| `packages/example/`                | Consumer-facing generated schemas, scenario interface, console adapter, and tests.    |
| `docs/`                            | Curated human and agent documentation.                                                |
| `build-protocol/`                  | Durable task, review, decision, provenance, and work records.                         |
| `scripts/`                         | Deterministic repository checks, including documentation validation.                  |

Generated TypeScript under `src/generated` is disposable and ignored. The
vendored `spine/options.proto` is immutable: it is a source input, not a local
style or design canvas.

## Runtime flow

1. Buf generates Protobuf-ES schemas containing descriptors and option
   extensions.
2. `validate(schema, message)` keeps each generated descriptor paired with its
   matching message shape at compile time, creates a root context with the
   entry schema's type name, and builds a registry from its file dependency
   closure.
3. The runtime evaluates message-level `(require)`, then each field in
   descriptor order through its fixed validator sequence, then oneof `(choice)`.
4. Option modules construct `ConstraintViolation` envelopes through the shared
   contract. Nested validation keeps the original root type and extends the
   field path only to leaf failures.
5. Callers render the template with `Violations.formatMessage()` or the
   convenience `formatViolations()` function.

This ordering makes diagnostics deterministic for the current runtime, but it
is not a public ordering compatibility promise.

## Public and internal seams

The complete supported public seam is the package entry point: `validate`,
`formatViolations`, `Violations`, `ValidationConfigurationError`,
`ValidationConfigurationErrorCode`, `ValidationConfigurationErrorInit`, and
the exported diagnostic types `ConstraintViolation`, `ValidationError`,
`TemplateString`, and `FieldPath`. `formatTemplateString` is physically
exported for compatibility but marked internal; consumers must not use it as a
supported direct API. Option modules, orchestration adapters, descriptor
registry, and template envelope are internal implementation seams.

The example has a separate seam by design: `runExampleScenarios()` returns
inspectable records and `src/index.ts` only prints them. Tests exercise the
result interface with real generated schemas, so console output remains an
adapter rather than the behavior under test.

## Source-of-truth precedence

Use this order when changing a claim or behavior:

1. explicit approved human direction and accepted decisions;
2. the immutable upstream Proto documentation at its recorded revision;
3. the current technical specification and task record;
4. project runtime code and behavior tests;
5. this guide and historical logs.

The JVM implementation is not a default design reference. The current open
boundary is Java `Pattern` compatibility: this runtime uses ECMAScript
`RegExp`; a Java-dialect engine is neither implemented nor promised.

## Change recipes

- **Option behavior:** update the approved contract source/test interpretation,
  add a failing generated-schema behavior test in
  `packages/validation/tests/`, make the smallest option-module
  change, then update [the contract](validation-contract.md).
- **Example:** change only project-owned example Proto/source, regenerate,
  cover the scenario interface in `packages/example/tests/scenarios.test.ts`,
  and keep intentionally invalid declarations in
  `packages/example/proto/testing/invalid_configuration.proto` rather than
  runnable schemas.
- **Documentation:** update the affected package README, curated guide, and
  TypeDoc comments. Run `pnpm docs:check`; it validates maintained local
  links, TS snippets, named public imports, placeholders, and active example
  syntax.

## Testing and delivery

Focused inner-loop commands are `pnpm test:validation`,
`pnpm test:example`, and `pnpm docs:check`. The canonical gate is
`pnpm verify`; it regenerates code, typechecks, lints, formats, tests with
coverage, checks docs and Proto provenance/lint, verifies generation, builds,
checks package contents, and checks the diff. The contribution workflow is in
[contributing.md](contributing.md).

## Limitations and agent navigation

The validator has a fixed internal module sequence. It imposes no depth, cycle,
or violation budget because the approved JVM comparison defines none; cyclic ad
hoc JavaScript objects are outside the valid Protobuf message model. Generated
output uses Buf's `import_extension=js` option directly; project code locally
aliases the generated `require` extension as `requireFields` without patching
generated files.
Start every task with `AGENTS.md`, then the active task in
`build-protocol/tasks/`, its work log, and the current technical specification.
Use [the documentation index](README.md) for reader-facing orientation.
