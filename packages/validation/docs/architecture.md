# Architecture

The [package guide](../README.md) describes the public interface. This page
maps the repository-owned implementation seams.

| Area                         | Responsibility                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `src/index.ts`               | Small public API and generated diagnostic type exports.                                  |
| `src/validation.ts`          | `validate`, violation presentation, root registry construction, and fixed orchestration. |
| `src/validation-contract.ts` | Context, paths, packed values, template envelopes, and descriptor access.                |
| `src/options/`               | One owner for each option family.                                                        |
| `src/options-registry.ts`    | Generated option-extension lookup.                                                       |
| `proto/`                     | Immutable upstream inputs plus project-owned supporting Proto files.                     |
| `packages/example/`          | Runnable consumer schemas, scenarios, console presentation, and tests.                   |
| `scripts/`                   | Deterministic documentation, source, package, and generated-output checks.               |

Generated TypeScript is disposable and ignored. Frozen Spine Proto inputs are
verified by provenance and checksum; they are not a local style-editing target.

## Runtime flow

1. Buf generates Protobuf-ES schemas with descriptors and option extensions.
2. `validate(schema, message)` pairs the generated schema with its message
   shape, creates the root context, and builds a registry from the schema file
   dependency closure.
3. The runtime evaluates message `(require)`, each field in descriptor order,
   then oneof `(choice)`.
4. Option owners append data violations or throw a
   `ValidationConfigurationError` for invalid supported declarations.
5. Consumers render diagnostics with `Violations.formatMessage()` or
   `Violations.formatAll()`.

The current order is deterministic but not a public compatibility guarantee.

## Sources of truth

When changing behavior or a claim, use explicit approved direction first, then
the frozen upstream Proto documentation at its recorded revision, the current
technical specification, runtime code and behavior tests, and finally this
reference. The JVM implementation is consulted only when an approved comparison
requires it.

The validation contract documents the open Java `Pattern` boundary: this
runtime uses ECMAScript `RegExp` and neither implements nor promises Java
regular-expression compatibility.

## TypeDoc

TypeDoc is generated below this directory at [API reference](api/reference/index.html).
It covers the public entry point and requires complete exported declarations.
