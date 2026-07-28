# T-0004: Adopt The Current Spine TS Toolchain

Status: Active
Classification: High-risk
Baseline: `d60fa4a2c1e0050c4517b52ca49c8de43cdc7d02`
Branch: `task/T-0004-spine-ts-toolchain`
Worktree: `.worktrees/T-0004-spine-ts-toolchain`
Approved plan: Human approval in the Codex task on 2026-07-28

## Acceptance Criteria

- The workspace uses pnpm `11.9.0`, Node `24.18.0`, TypeScript `6.0.3`,
  Vitest `4.1.9` with V8 coverage, ES2024, NodeNext, ESM, strict project
  references, and package export maps following the pinned Spine TS reference.
- A committed pnpm lockfile and workspace configuration replace npm workspace
  installation and the npm lockfile.
- Jest configuration, dependencies, scripts, and APIs are removed while all
  existing validation and example assertions remain behaviorally equivalent.
- CI, publication, generated-source checks, documentation checks, package
  checks, and the installed-consumer smoke test execute through pnpm.
- The canonical full gate is `pnpm verify`, enforcing at least 90% statements,
  branches, functions, and lines.
- The packed package is consumed as ESM through its public export map.
- Root, package, contributor, architecture, and protocol documentation describe
  the current executable toolchain; root README changes remain minimal.
- The reviewed task branch and merged `dev` pass fresh full gates and are
  pushed. `master` remains untouched.

## Human-Imposed Requirements Ledger

| Requirement                                                                            | Source               | Verification                         |
| -------------------------------------------------------------------------------------- | -------------------- | ------------------------------------ |
| Match package manager, test runner, and module format used by Spine TS.                | Approved plan        | Reference pin and configuration diff |
| Perform the approved tasks autonomously and push remote work even before integration.  | Human task           | Remote-ref verification              |
| Do not stop except for a protocol-defined real blocker.                                | Human task           | Work log                             |
| Update documentation after implementation and keep root README changes necessary only. | Human task           | Documentation review                 |
| Preserve universal 90% coverage before behavioral expansion.                           | Prior human decision | Vitest coverage report               |
| Never merge or push `master`.                                                          | Branch policy        | Remote-ref verification              |

## Skills

| Skill                            | Selected? | Reason                                                                         |
| -------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `executing-plans`                | Yes       | Execute the approved multi-milestone plan with recorded checkpoints.           |
| `subagent-driven-development`    | Yes       | One writer owns overlapping migration files and specialists review the result. |
| `using-git-worktrees`            | Yes       | Isolate the high-risk build migration from `dev`.                              |
| `test-driven-development`        | Yes       | Preserve behavior while migrating the test harness and consumer contract.      |
| `monorepo-management`            | Yes       | Align workspace, dependency, and task-runner configuration.                    |
| `javascript-testing-patterns`    | Yes       | Translate Jest tests to Vitest without weakening assertions.                   |
| `requesting-code-review`         | Yes       | Run relevant whole-task specialist review.                                     |
| `verification-before-completion` | Yes       | Require fresh focused, canonical, and post-merge evidence.                     |

## Agent Dispatch

| Role/function         | Agent ID                   | Expected model  | Expected reasoning | Scope                                                                 | Status              |
| --------------------- | -------------------------- | --------------- | ------------------ | --------------------------------------------------------------------- | ------------------- |
| Requirements split    | `/root/t0004_requirements` | `gpt-5.6-sol`   | high               | Audit the migration sequence and acceptance coverage                  | Complete and closed |
| Implementation        | `/root/t0004_implementer`  | `gpt-5.6-terra` | medium             | Own all T-0004 production, test, build, CI, and documentation changes | Complete and closed |
| Style review          | `/root/t0004_style`        | `gpt-5.6-terra` | high               | Whole-task maintainability, test parity, and configuration clarity    | Complete and closed |
| TypeScript/API review | `/root/t0004_api`          | `gpt-5.6-terra` | high               | ESM exports, declarations, NodeNext, and package compatibility        | Complete and closed |
| Reliability review    | `/root/t0004_reliability`  | `gpt-5.6-terra` | high               | Lock policy, CI, deterministic gates, packaging, and publication      | Complete and closed |
| Documentation review  | `/root/t0004_docs`         | `gpt-5.6-terra` | medium             | Maintained docs, commands, navigation, and root README restraint      | Complete and closed |

## Scope And Ownership

- One implementation owner owns all overlapping T-0004 source, test,
  configuration, lockfile, workflow, script, and documentation changes.
- The orchestrator owns task records, review aggregation, verification, Git
  integration, remote synchronization, and worktree cleanup.
- Review agents are read-only and are closed immediately after reporting.
- Excluded: runtime semantic changes, type-boundary refactoring assigned to
  T-0005, time options assigned to T-0006, Java regex compatibility,
  dependency upgrades not required by the migration, and `master`.

## Implementation Plan

1. Audit the exact pinned Spine TS tool versions and migration sequence.
2. Establish pnpm and its deterministic lockfile before changing the compiler
   or tests; prove frozen installation.
3. Build the strict ES2024/NodeNext project-reference graph and make handwritten
   and generated runtime imports NodeNext-safe while retaining compatibility
   patching for removal in T-0005.
4. Define the ESM-only package export map, then convert the unchanged validation
   and example corpus from Jest to Vitest with universal 90% coverage.
5. Convert every executable path—scripts, generation checks, package consumer,
   CI, and publication—to pnpm. The installed consumer must import the packed
   package only through its public ESM export map.
6. Update maintained toolchain documentation with minimal root README changes.
7. Run focused checks, a complete specialist review wave, one deduplicated
   correction batch, the canonical full gate, task push, `dev` integration,
   post-merge verification, and remote-ref confirmation.

## Decisions And Questions

- Reference Spine TS commit:
  `f8a59883e71db0d9f9f0854039c313dbbce61801`.
- Retain current Buf versions unless the toolchain migration proves them
  incompatible.
- T-0004 converts generated compatibility patch scripts to ESM only; T-0005
  owns removing them.
- No material question remains open for T-0004.

## Verification

| Command                          | Result                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| Baseline `npm run verify`        | Passed on 2026-07-28: 293 library tests, 7 example tests, all canonical gates      |
| `pnpm install --frozen-lockfile` | Passed: 225 lock entries accepted by policy; 189 packages installed with integrity |
| Implementation `pnpm verify`     | Passed: 15 files and 300 tests; all canonical pnpm/ESM gates                       |

Coverage: migrated Vitest/V8 result is 93.85% statements, 91.36% branches,
99.01% functions, and 95.15% lines.

## Review Dispositions

| Concern                 | Reviewer                  | Disposition                                          | Evidence   |
| ----------------------- | ------------------------- | ---------------------------------------------------- | ---------- |
| Style/maintainability   | `/root/t0004_style`       | F-004 accepted for correction                        | Review log |
| Documentation           | `/root/t0004_docs`        | F-006 and F-007 accepted for correction              | Review log |
| TypeScript/API          | `/root/t0004_api`         | F-005 and F-006 accepted for correction              | Review log |
| Performance/reliability | `/root/t0004_reliability` | F-001 through F-004 accepted for correction          | Review log |
| Security                | N/A                       | No new trust boundary or credential flow is planned. | D-0004     |

## Findings

| ID    | Severity | Accepted? | Resolution                                                 |
| ----- | -------- | --------- | ---------------------------------------------------------- |
| F-001 | P1       | Yes       | Confirmed by narrow re-review                              |
| F-002 | P1       | Yes       | Confirmed by narrow re-review                              |
| F-003 | P2       | Yes       | Confirmed by narrow re-review                              |
| F-004 | P2       | Yes       | Residual cross-platform required-target correction pending |
| F-005 | P1       | Yes       | Confirmed by narrow re-review                              |
| F-006 | P2       | Yes       | Residual user-guide compatibility statement pending        |
| F-007 | P2       | Yes       | Confirmed by narrow re-review                              |

## Integration

- Task commit:
- Task push: `origin/task/T-0004-spine-ts-toolchain@1bf3cb45bb9554946d50e5ecef08e9c4e0b819cc`
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:

## Open Risks And Follow-Up

| Risk                                                                                                          | Owner  | Route                                       | Disposition | Review point       |
| ------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- | ----------- | ------------------ |
| ESM or TS6 exposes latent package-boundary assumptions.                                                       | T-0004 | Focused package consumer and API review     | Open        | Before integration |
| Toolchain changes mask test-behavior loss.                                                                    | T-0004 | Assertion inventory and coverage comparison | Open        | Before review      |
| TS6 strictness, generated import extensions, V8 coverage, or `workspace:*` packing exposes migration defects. | T-0004 | Dependency-ordered focused gates            | Open        | Before review      |
