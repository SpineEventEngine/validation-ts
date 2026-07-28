# T-0005: Strengthen Runtime Architecture Boundaries

Status: Active
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

| Role/function      | Agent ID                   | Expected model  | Expected reasoning | Scope                                                                      | Status  |
| ------------------ | -------------------------- | --------------- | ------------------ | -------------------------------------------------------------------------- | ------- |
| Requirements split | `/root/t0005_requirements` | `gpt-5.6-sol`   | high               | Resolve the Protobuf-ES generic type model and safe patch-removal sequence | Running |
| Implementation     | Pending                    | `gpt-5.6-terra` | medium             | Own T-0005 runtime, generation, tests, scripts, and maintained docs        | Pending |

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

1. Resolve the narrowest reusable Protobuf-ES schema/message generic aliases
   and type the public `validate()` relationship without changing runtime
   behavior.
2. Propagate precise message/schema types through validation context,
   orchestration, nested validation, option validators, and the option registry;
   remove internal `any` while retaining only documented test casts for invalid
   schema fixtures.
3. Remove both generated compatibility patchers and their canonical fixture
   suite. Import the generator-owned `require` extension under the local alias
   `requireFields`; retain only NodeNext import-extension handling through
   supported Buf generation options.
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
- No material human question remains open.

## Verification

| Command                | Result                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Baseline `pnpm verify` | Passed: 15 files / 300 tests, four patcher contract tests, all canonical gates |

Coverage: 93.85% statements, 91.36% branches, 99.01% functions, and 95.15%
lines.

## Review Dispositions

| Concern                 | Reviewer | Disposition                                                                 | Evidence |
| ----------------------- | -------- | --------------------------------------------------------------------------- | -------- |
| Style/maintainability   | Pending  | Pending                                                                     |          |
| Documentation           | Pending  | Pending                                                                     |          |
| TypeScript/API          | Pending  | Pending                                                                     |          |
| Performance/reliability | Pending  | Pending                                                                     |          |
| Security                | N/A      | No new trust boundary, credential flow, or publication behavior is planned. | D-0004   |

## Findings

| ID  | Severity | Accepted? | Resolution |
| --- | -------- | --------- | ---------- |

## Integration

- Task head and push:
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:
