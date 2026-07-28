# T-0005: Strengthen Runtime Architecture Boundaries

Status: Approved
Classification: Standard
Baseline: Current `dev` after T-0004
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

Recorded when T-0005 becomes active.

## Scope And Ownership

- Included: validation runtime type boundaries, registry typing, internal
  validator assembly, generated import aliases, tests, and maintained docs.
- Excluded: public validator extensibility, behavioral validation changes,
  time options, Java regex compatibility, and `master`.

## Verification

Pending.
