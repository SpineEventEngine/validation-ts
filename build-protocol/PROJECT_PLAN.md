# Project Plan

## Active Milestone

| ID     | Milestone                                                                         | Status      |
| ------ | --------------------------------------------------------------------------------- | ----------- |
| T-0001 | Install the modern agentic build protocol and reproducible verification baseline. | Complete    |
| T-0002 | Correct non-regex validation semantics and reach universal 90% coverage.          | Complete    |
| T-0003 | Modernize the example, execute it in CI, and build agent-ready documentation.     | Complete    |
| T-0004 | Adopt the current Spine TS pnpm, Vitest, TypeScript, and ESM build stack.         | Complete    |
| T-0005 | Remove generated-code patching and strengthen runtime type boundaries.            | Complete    |
| T-0006 | Implement the frozen Spine `(when)` time-validation contract.                     | Complete    |
| T-0007 | Restore clean-CI documentation compilation after the pnpm migration.              | Complete    |
| T-0008 | Move pnpm workflow setup to its supported Node 24 action runtime.                 | Complete    |
| T-0009 | Restore package guidance and enforce concise, documented source conventions.      | Complete    |
| T-0010 | Restore beginner guidance, add developer documentation, and govern version bumps. | Complete    |
| T-0011 | Teach domain ID messages and beginner-ready Proto examples.                       | In progress |

## Accepted Follow-Up Boundaries

- T-0004 replaces npm, Jest, and CommonJS with the current stack used by the
  pinned Spine TS reference.
- Reach at least 90% statements, branches, functions, and lines before
  substantial behavioral expansion.
- T-0005 is limited to type-boundary and generated-code integration debt; it
  does not create a public validator-extension API or recursion budgets.
- T-0006 adds Validation TS extensions from immutable
  `spine/time_options.proto` and `spine/time.proto` definitions, matching the
  approved JVM comparison points.
- Keep Java `Pattern` compatibility unresolved during T-0002. Do not add a
  third-party or project-owned regex engine without a later approved decision.

No feature roadmap is inferred here. The human supplies future tasks, the
orchestrator investigates and plans them, and implementation starts only after
explicit approval.
