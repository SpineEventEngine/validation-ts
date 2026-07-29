# T-0009 Task 2 Core Ownership Report

## Result

The inherited public/example checkpoint and the remaining core ownership
tranche are ready for review. The public `validate()` function remains the
only standalone function in the core and example source roots.

## Core owners

- `ValidationOrchestration` owns legacy adapter normalization and message-level
  diagnostics.
- `ValidationContext.create()` owns root-context construction;
  `MessageFields` remains the local reflective read seam.
- `ViolationFactory.create()` owns descriptor-aware violation envelopes and
  their packing/placeholder helpers.
- Internal `ValidationEngine` owns traversal, registry construction, and
  dependency closure. Its nested-validator callback uses an explicit owner
  reference to preserve recursion behavior.

## Evidence

- RED: the updated contract test failed with missing
  `ValidationContext.create`/`ValidationOrchestration` methods.
- GREEN: `pnpm exec vitest run packages/validation/tests/validation-contract.test.ts`
  passed 9/9.
- `pnpm typecheck:generated` passed.
- `pnpm exec vitest run packages/validation/tests packages/example/tests/scenarios.test.ts`
  passed 17 suites and 319 tests.
- `pnpm source:check` reports zero standalone functions in the core/example
  files. It reports 61 remaining standalone-function findings in option
  modules, intentionally deferred to the option-ownership slice.

## Concern

`pnpm source:check` remains nonzero due to its Task 3 documentation, naming,
Proto-comment inventory and the deferred option-module standalone findings.
