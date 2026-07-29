# T-0007: Restore Clean-CI Documentation Compilation

Status: Active
Classification: Standard
Baseline: `33a0a83c5b8707d5957655f2ece06e28fed09834`
Branch: `task/T-0007-ci-doc-dependency`
Worktree: `.worktrees/T-0007-ci-doc-dependency`
Approved plan: Human instruction to address the attached CI failure on
2026-07-29

## Acceptance Criteria

- A clean pnpm installation provides every external package imported by the
  repository-owned documentation compiler.
- The documentation regression suite fails when the root documentation tooling
  does not directly declare `@bufbuild/protobuf`.
- `pnpm docs:check` and the canonical `pnpm verify` gate pass after a frozen
  lockfile installation.
- The task branch and merged `dev` are pushed, remote refs are confirmed, and
  the corresponding GitHub Actions run succeeds.
- `master` remains untouched.

## Human-Imposed Requirements Ledger

| Requirement                                              | Source              | Verification                                      |
| -------------------------------------------------------- | ------------------- | ------------------------------------------------- |
| Address the CI error that began with T-0004 integration. | Human task          | Clean-layout regression and remote Actions result |
| Execute the fix without another approval pause.          | Human clarification | Autonomous implementation through remote CI       |
| Preserve the established task-branch and `dev` workflow. | Repository protocol | Branch, merge, and remote-ref evidence            |
| Do not merge or push `master`.                           | Branch policy       | Remote-ref comparison                             |

## Skills

| Skill                            | Selected? | Reason                                                               |
| -------------------------------- | --------- | -------------------------------------------------------------------- |
| `systematic-debugging`           | Yes       | Reproduce and isolate the known CI regression before changing files. |
| `using-git-worktrees`            | Yes       | Isolate the shared-tooling and lockfile correction.                  |
| `test-driven-development`        | Yes       | Add and observe a failing dependency-ownership regression first.     |
| `implement`                      | Yes       | Give one bounded owner the test, manifest, lockfile, and task logs.  |
| `subagent-driven-development`    | Yes       | Use the project implementer and specialist review roles.             |
| `requesting-code-review`         | Yes       | Review the complete immutable task diff before integration.          |
| `verification-before-completion` | Yes       | Require fresh focused, full-gate, and remote-CI evidence.            |
| `openai-docs`                    | No        | No Codex configuration or durable Codex guidance changes.            |

## Agent Dispatch

| Role/function                | Agent ID                  | Expected model  | Expected reasoning | Scope                                                  | Status    |
| ---------------------------- | ------------------------- | --------------- | ------------------ | ------------------------------------------------------ | --------- |
| Implementation               | `/root/t0007_implementer` | `gpt-5.6-terra` | medium             | Own regression test, root manifest, lockfile, and logs | Completed |
| Style/maintainability review | `/root/t0007_style`       | `gpt-5.6-terra` | high               | Test quality, dependency ownership, minimality         | Completed |
| Reliability review           | `/root/t0007_reliability` | `gpt-5.6-terra` | high               | Clean-install determinism and CI-path reliability      | Completed |

## Scope And Ownership

- The implementation owner owns `scripts/check-documentation.test.mjs`,
  `package.json`, `pnpm-lock.yaml`, this task record, and the T-0007 work log.
- The orchestrator owns review aggregation, final verification, Git
  integration, remote synchronization, Actions confirmation, and cleanup.
- Excluded: workflow restructuring, Node or pnpm upgrades, package migrations,
  public runtime behavior, documentation content, publication, and `master`.

## Decisions And Questions

- Root cause: T-0004 replaced npm workspace hoisting with pnpm's isolated
  layout. The root documentation compiler directly consumes
  `@bufbuild/protobuf`, but the root manifest did not declare it.
- Existing stale npm-hoisted files masked the defect locally. A clean temporary
  layout reproduced the attached CI error exactly.
- Declare the already locked `@bufbuild/protobuf` `2.13.0` as a root
  development dependency. Do not add a TypeScript path into package-local
  `node_modules`, because that would depend on package-manager layout.
- No material questions remain.

## Verification

| Command                                                                    | Result                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `node --test scripts/check-documentation.test.mjs` (RED)                   | Failed as expected: root `devDependencies` lacks `@bufbuild/protobuf` `2.13.0`. |
| `pnpm install --frozen-lockfile`                                           | Passed; frozen lockfile supplied the new direct root development dependency.    |
| `pnpm docs:check`                                                          | Passed: regression suite, TypeDoc, and maintained documentation checker.        |
| `pnpm format:check`                                                        | Passed after formatting the two T-0007 durable records.                         |
| `git diff --check`                                                         | Passed.                                                                         |
| `pnpm verify`                                                              | Passed: all canonical gates, 17 files / 319 tests, and packed consumer.         |
| External clean checkout: frozen install, generation, and `pnpm docs:check` | Passed without access to the parent checkout or stale root modules.             |

Coverage: 94.71% statements, 91.51% branches, 99.19% functions, and 95.96%
lines.

## Review Dispositions

| Concern                 | Reviewer                  | Disposition        | Evidence                                                                                  |
| ----------------------- | ------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Style/maintainability   | `/root/t0007_style`       | Correction pending | Dependency ownership and test are clean; durable verification evidence needed one update. |
| Documentation           | N/A                       | N/A                | No maintained documentation content changes.                                              |
| TypeScript/API          | N/A                       | N/A                | No package source, declaration, export, or public API changes.                            |
| Performance/reliability | `/root/t0007_reliability` | Clean              | Frozen install, lock importer, clean Ubuntu path, and layout-independent guard reviewed.  |
| Security                | N/A                       | N/A                | Existing exact locked package/version; no dependency graph or runtime exposure change.    |

## Findings

| ID    | Severity | Accepted? | Resolution                                                                                     |
| ----- | -------- | --------- | ---------------------------------------------------------------------------------------------- |
| T7-R1 | P2       | Yes       | Record the completed full gate and external clean-checkout evidence in the task and work logs. |

## Integration

- Task commit:
- Task push:
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:

## Open Risks And Follow-Up

| Risk                                                                   | Owner        | Route                                                           | Disposition                                   | Review point               |
| ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- | --------------------------------------------- | -------------------------- |
| Clean CI may expose another previously hoisted package after this fix. | Orchestrator | Run the entire frozen-install gate and remote Actions workflow. | Locally resolved; remote confirmation pending | Before integration closure |
