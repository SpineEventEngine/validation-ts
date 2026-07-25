# Project Plan

## Active Milestone

| ID     | Milestone                                                                         | Status   |
| ------ | --------------------------------------------------------------------------------- | -------- |
| T-0001 | Install the modern agentic build protocol and reproducible verification baseline. | Complete |
| T-0002 | Correct non-regex validation semantics and reach universal 90% coverage.          | Complete |
| T-0003 | Modernize the example, execute it in CI, and build agent-ready documentation.     | Complete |

## Accepted Follow-Up Boundaries

- Keep npm, Jest, and CommonJS during T-0001.
- Migrate to the package manager, test runner, and module format used by
  `/Users/armiol/development/experiments/spine-ts` only through a later,
  separately discussed and approved task.
- Reach at least 90% statements, branches, functions, and lines before
  substantial behavioral expansion.
- Add Validation TS extensions from immutable
  `spine/time_options.proto` definitions in future approved milestones.
- Keep Java `Pattern` compatibility unresolved during T-0002. Do not add a
  third-party or project-owned regex engine without a later approved decision.

No feature roadmap is inferred here. The human supplies future tasks, the
orchestrator investigates and plans them, and implementation starts only after
explicit approval.
