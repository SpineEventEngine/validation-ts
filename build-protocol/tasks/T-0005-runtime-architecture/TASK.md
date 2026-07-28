# T-0005: Strengthen Runtime Architecture Boundaries

Status: Ready for integration
Classification: High-risk
Baseline: `df8cbb187488f4f9bc170dcc226f18eab27f9f8f`
Branch: `task/T-0005-runtime-architecture`
Worktree: `.worktrees/T-0005-runtime-architecture`
Approved plan: Human approval in the Codex task on 2026-07-28

## Acceptance Criteria

- Validation schema, message, and registry boundaries use specific generic
  Protobuf-ES types; avoid internal `any`.
- Generated compatibility patch scripts are removed.
- Project code aliases the generated `require` extension as `requireFields`
  at import sites without modifying generator output.
- The fixed validator sequence remains internal behind a small adapter; no
  unsupported public validator-extension API is introduced.
- Runtime behavior and the universal 90% coverage gate remain unchanged.
- No recursion, depth, or violation budget is invented because JVM Validation
  defines none and cyclic JavaScript objects are outside the valid Proto model.
- Architecture, contract, and contributor documentation reflect the resulting
  boundaries with only necessary root README changes.

## Human-Imposed Requirements Ledger

| Requirement                                                                         | Source                       | Verification                           |
| ----------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| Match JVM Validation where specifically requested.                                  | Human decision               | Focused JVM comparison notes and tests |
| Do not invent recursion limits absent from JVM behavior.                            | Approved analysis            | Architecture review                    |
| Work autonomously, push the task and integration refs, and keep `master` untouched. | Human task and branch policy | Remote-ref verification                |

## Agent Dispatch

| Role/function         | Agent ID                   | Expected model  | Expected reasoning | Scope                                                                      | Status              |
| --------------------- | -------------------------- | --------------- | ------------------ | -------------------------------------------------------------------------- | ------------------- |
| Requirements split    | `/root/t0005_requirements` | `gpt-5.6-sol`   | high               | Resolve the Protobuf-ES generic type model and safe patch-removal sequence | Complete and closed |
| Implementation        | `/root/t0005_implementer`  | `gpt-5.6-terra` | medium             | Own T-0005 runtime, generation, tests, scripts, and maintained docs        | Complete and closed |
| Style review          | `/root/t0005_style`        | `gpt-5.6-terra` | high               | Internal seam, type propagation, tests, and patcher removal                | Complete and closed |
| TypeScript/API review | `/root/t0005_api`          | `gpt-5.6-terra` | high               | Public generic inference, declarations, option types, and compatibility    | Complete and closed |
| Reliability review    | `/root/t0005_reliability`  | `gpt-5.6-terra` | high               | Direct generation, determinism, ordering, recursion boundary, and gates    | Complete and closed |
| Documentation review  | `/root/t0005_docs`         | `gpt-5.6-terra` | medium             | Architecture/contract/contributor/package accuracy and agent usability     | Complete and closed |

## Scope And Ownership

- Included: validation runtime type boundaries, registry typing, internal
  validator assembly, generated import aliases, tests, and maintained docs.
- Excluded: public validator extensibility, behavioral validation changes,
  time options, Java regex compatibility, and `master`.

## Skills

| Skill                            | Selected? | Reason                                                                            |
| -------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `executing-plans`                | Yes       | Execute the approved architecture-debt milestone with checkpoints.                |
| `subagent-driven-development`    | Yes       | Keep one writer across overlapping runtime and generation seams.                  |
| `using-git-worktrees`            | Yes       | Isolate the high-risk public typing and generation refactor.                      |
| `test-driven-development`        | Yes       | Preserve runtime and generated-source behavior while changing structure.          |
| `codebase-design`                | Yes       | Deepen the internal validation and registry modules without public extensibility. |
| `typescript-advanced-types`      | Yes       | Use precise Protobuf-ES generics without assertions that erase the contract.      |
| `requesting-code-review`         | Yes       | Require maintainability, API, and reliability review.                             |
| `verification-before-completion` | Yes       | Require fresh focused, canonical, and post-merge evidence.                        |

## Implementation Plan

1. Use `S extends DescMessage` with `NoInfer<MessageShape<S>>` for the public
   `validate()` relationship. Use `DescMessage`, `Message`, and `Registry` at
   erased descriptor/registry seams; add a compile-time mismatched-pair
   regression.
2. Propagate precise message/schema types through validation context,
   orchestration, nested validation, option validators, and the option registry;
   remove internal `any` while retaining only documented test casts for invalid
   schema fixtures.
3. Remove both generated compatibility patchers and their canonical fixture
   suite. Add `import_extension=js` to validation source/test Buf generation
   and import generator-owned `require` under the local alias `requireFields`.
4. Keep the fixed validator sequence private behind the existing small adapter;
   do not expose registry or extension hooks.
5. Update architecture, contract, contributor, package, TypeDoc, and protocol
   documentation with necessary-only root README changes.
6. Run focused generation/type/API tests, the full specialist review wave, one
   deduplicated correction batch, fresh `pnpm verify`, task push, `dev`
   integration, post-merge verification, and remote-ref confirmation.

## Decisions And Questions

- JVM recursion contains no depth, cycle, or violation budget; T-0005 adds none.
- Valid Protobuf messages are the supported object graph. Cyclic ad hoc
  JavaScript objects are outside the contract.
- The validator sequence is internal and fixed; public extensibility remains
  explicitly excluded.
- The closed option registry uses a keyed generic lookup returning
  `OptionRegistry[N]`; it never returns `undefined` and must preserve each
  extension's value type.
- One localized descriptor-driven field reader may bridge `Message` to unknown
  field values. Do not impose a string index signature on generated messages.
- No material human question remains open.

## Verification

| Command                      | Result                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Baseline `pnpm verify`       | Passed: 15 files / 300 tests, four patcher contract tests, all canonical gates                                                   |
| Focused implementation       | Passed: typecheck, 14 files / 293 tests, lint, formatting, deterministic generation                                              |
| Implementation `pnpm verify` | Passed: 15 files / 300 tests; 94.07% statements, 91.56% branches, 99.03% functions, 95.40% lines                                 |
| Correction `pnpm verify`     | Passed: 15 files / 300 tests; 94.07% statements, 91.56% branches, 99.03% functions, 95.40% lines                                 |
| Residual F-001 `pnpm verify` | Passed: four generation-guard tests and 15 files / 300 tests; 94.07% statements, 91.56% branches, 99.03% functions, 95.40% lines |

Baseline coverage: 93.85% statements, 91.36% branches, 99.01% functions, and
95.15% lines.

## Review Dispositions

| Concern                 | Reviewer                  | Disposition                                                                 | Evidence   |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------- | ---------- |
| Style/maintainability   | `/root/t0005_style`       | Clean after F-002 and F-003 correction                                      | Review log |
| Documentation           | `/root/t0005_docs`        | Clean after F-005 and F-006 correction                                      | Review log |
| TypeScript/API          | `/root/t0005_api`         | Clean after F-004 correction                                                | Review log |
| Performance/reliability | `/root/t0005_reliability` | Clean after F-001 correction                                                | Review log |
| Security                | N/A                       | No new trust boundary, credential flow, or publication behavior is planned. | D-0004     |

## Findings

| ID    | Severity | Accepted? | Resolution                                                               |
| ----- | -------- | --------- | ------------------------------------------------------------------------ |
| F-001 | P1       | Yes       | Corrected: lifecycle siblings rejected and guard tests wired into verify |
| F-002 | P2       | Yes       | Complete: compile-time fixture is uncalled                               |
| F-003 | P2       | Yes       | Complete: baseline coverage labeled explicitly                           |
| F-004 | P2       | Yes       | Complete: TypeScript >=5.4 documented                                    |
| F-005 | P2       | Yes       | Complete: explicit recursion/cycle boundary documented                   |
| F-006 | P2       | Yes       | Complete: reviewer statuses corrected                                    |

## Integration

- Task head and push:
  Reviewed implementation head
  `2e4b91c4707e724e7f6155dee7b038cd0fc86ad9`; closure commit and push follow.
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:
