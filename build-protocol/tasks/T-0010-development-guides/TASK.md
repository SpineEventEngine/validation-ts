# T-0010: Restore Beginner And Development Guides

Status: In Progress
Classification: Standard
Baseline: `60fd57ec66d73d769f0ce4029846ad3726e3e41e`
Branch: `task/T-0010-development-guides`
Worktree: `.worktrees/T-0010-development-guides`
Approved plan: Human-approved documentation, permanent version policy, and
snapshot-bump plan on 2026-07-31

## Acceptance Criteria

- Restore `packages/example/README.md` from the `master` version as the
  editorial baseline, preserving its beginner audience, style, and wording
  while updating commands and current validation scenarios.
- Create a comprehensive `packages/validation/docs/development.md` with
  accurate prerequisites, supported environments, setup, commands, and
  copy-ready workflows for ordinary maintenance and extension work.
- Rewrite `packages/validation/docs/contributing.md` as a contribution guide
  and link both guides from the package README, documentation index, and
  necessary root navigation.
- Record a permanent rule that every root framework-version change occurs in
  an isolated commit whose exact subject is `Bump version -> <version>`.
- Correct maintained development policy that still describes the retired
  npm, Jest, CommonJS, and `package-lock.json` toolchain. Preserve historical
  task, review, and work logs unchanged.
- After documentation and policy work, advance all three synchronized
  workspace manifests to `2.0.0-snapshot.7` in a version-only commit named
  exactly `Bump version -> 2.0.0-snapshot.7`.
- Preserve runtime behavior, public TypeScript declarations, immutable Proto
  files, dependencies, generated sources, and at least 90% coverage in every
  dimension.
- Integrate only into `dev`, push the task and integration branches, verify
  remote refs, and remove the merged task branch locally and remotely without
  touching `master`.

## Human-Imposed Requirements Ledger

| Requirement                                                                 | Source       | Verification                                |
| --------------------------------------------------------------------------- | ------------ | ------------------------------------------- |
| Use the original example README from `master` as the editorial baseline.    | Human item 1 | Historical diff and documentation review    |
| Write the example for beginner humans in the root README's visual style.    | Human item 1 | Reader test and documentation review        |
| Create a long development guide with copy-ready setup and change workflows. | Human item 2 | Documentation review and command audit      |
| Give `contributing.md` a truthful title and contribution-specific content.  | Human item 2 | Documentation review                        |
| Link the development and contribution guides from README navigation.        | Human item 2 | Documentation link check                    |
| Make version changes in a separate version-only commit.                     | Human item 3 | Commit diff inspection                      |
| Use the exact subject template `Bump version -> <version>`.                 | Human item 3 | Commit subject inspection                   |
| Advance to the next snapshot and integrate into `dev` only.                 | Human item 4 | Manifest, branch, and remote-ref inspection |

## Skills

| Skill                            | Selected? | Reason                                                                                      |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `doc-coauthoring`                | Yes       | Separate beginner, maintainer, and contributor information and reader-test the results.     |
| `using-git-worktrees`            | Yes       | Isolate the standard multi-document and protocol task from the main checkout.               |
| `subagent-driven-development`    | Yes       | Use one documentation owner followed by focused specialist review.                          |
| `requesting-code-review`         | Yes       | Review reader fit, maintained policy, package metadata, and reliability before integration. |
| `verification-before-completion` | Yes       | Require fresh focused and complete evidence before commits, merge, and completion.          |
| `test-driven-development`        | No        | No runtime behavior or verification implementation is being added.                          |
| `implement`                      | No        | The approved repository plan and project-specific subagent cycle already define execution.  |

## Agent Dispatch

| Role/function                  | Agent ID                         | Expected model  | Expected reasoning | Scope                                                                                    | Status   |
| ------------------------------ | -------------------------------- | --------------- | ------------------ | ---------------------------------------------------------------------------------------- | -------- |
| Implementation                 | `/root/t0010_docs`               | `gpt-5.6-terra` | medium             | Own maintained README, development, contribution, protocol, and task-record changes      | Complete |
| Documentation review           | `/root/t0010_docs_review`        | `gpt-5.6-terra` | medium             | Beginner-reader test, guide completeness, commands, examples, and navigation             | Pending  |
| Style/maintainability review   | `/root/t0010_style_review`       | `gpt-5.6-terra` | high               | Structure, duplication, durable policy placement, and historical-log boundary            | Pending  |
| TypeScript/API review          | `/root/t0010_api_review`         | `gpt-5.6-terra` | high               | Package names, versions, public API claims, supported environments, and install guidance | Pending  |
| Performance/reliability review | `/root/t0010_reliability_review` | `gpt-5.6-terra` | high               | Copy-ready commands, clean-checkout sequencing, gates, commit isolation, and delivery    | Pending  |
| Security review                | N/A                              | `gpt-5.6-terra` | high               | No dependency, trust-boundary, runtime-input, or release publication change              | N/A      |

## Scope And Ownership

- The implementation owner may change maintained root/package/example
  READMEs, package-local development documents, current protocol guidance,
  T-0010 records, and the synchronized manifest versions.
- The orchestrator owns Git worktree creation, the isolated version commit,
  review aggregation, final verification, integration, remote synchronization,
  and cleanup.
- Historical task, review, decision, and work-log evidence remains unchanged
  except for new T-0010 records and the active project-plan row.
- Excluded: runtime behavior, TypeScript API, dependencies, generated files,
  immutable Proto inputs, CI behavior, publication, and `master`.

## Decisions And Questions

- `2.0.0-snapshot.7` is the next version under the established
  `2.0.0-snapshot.<increment>` scheme.
- The exact version-install example remains at the latest published preview,
  `2.0.0-snapshot.6`, until the next snapshot is published from `master`.
- All three workspace manifests remain synchronized in the isolated version
  commit; the lockfile does not encode workspace manifest versions.
- `packages/validation/README.md` is the primary navigation point for both new
  guides. The package documentation index and necessary root navigation also
  expose them.
- No unresolved human question remains.

## Verification

| Command                                                                                       | Result                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile`                                                     | Passed from the committed lockfile after approved network access.                                                            |
| `corepack pnpm test:validation` through initial `pnpm test`                                   | Passed 17 files and 312 tests.                                                                                               |
| Initial `corepack pnpm test:example` before build                                             | Failed because the fresh worktree had no validation-package `dist`; recorded as a setup sequencing requirement.              |
| `corepack pnpm build`                                                                         | Passed and created the workspace build output.                                                                               |
| `corepack pnpm test:example` after build                                                      | Passed 1 file and 8 tests.                                                                                                   |
| `pnpm docs:check`                                                                             | Passed: documentation checker regression tests, TypeDoc generation, and 8 maintained Markdown files.                         |
| `pnpm source:check`                                                                           | Passed.                                                                                                                      |
| `git diff --check`                                                                            | Passed.                                                                                                                      |
| `pnpm --filter @spine-event-engine/example-smoke test`                                        | Failed: the package-local Vitest process finds no tests under the root include pattern; guides now use build then root test. |
| `pnpm build && pnpm test:example`                                                             | Passed: build completed and the example suite passed 1 file and 8 tests.                                                     |
| Corrected `pnpm docs:check`, `pnpm source:check`, `pnpm format:check`, and `git diff --check` | Passed.                                                                                                                      |

Coverage: No runtime or test change in this implementation tranche; pending the
final full gate.

## Implementation Evidence

- Restored the example README from `master` as the editorial starting point,
  retaining the beginner-focused quick start and updating it for pnpm,
  current scenarios, and `(when)` time examples.
- Added the development guide and rewrote the contribution guide, with
  package, documentation-index, example, and root navigation links.
- Corrected maintained pnpm/Vitest/ESM policy and command references in the
  active governance and immutable-Proto guidance. The exact published install
  example remains `2.0.0-snapshot.6`; no manifest version changed.
- Added the isolated synchronized-manifest version-commit rule to current
  governance and contributor guidance. The orchestrator retains the later
  version-only commit.

## Review Dispositions

| Concern                 | Reviewer                         | Disposition | Evidence                                                       |
| ----------------------- | -------------------------------- | ----------- | -------------------------------------------------------------- |
| Style/maintainability   | `/root/t0010_style_review`       | Complete    | Consolidated correction batch accepted.                        |
| Documentation           | `/root/t0010_docs_review`        | Complete    | Beginner guide, navigation, and workflow corrections accepted. |
| TypeScript/API          | `/root/t0010_api_review`         | Complete    | Manifest/version and API claims corrected or confirmed.        |
| Performance/reliability | `/root/t0010_reliability_review` | Complete    | Clean-host and example-test command corrections accepted.      |
| Security                | N/A                              | N/A         | No security-sensitive scope.                                   |

## Findings

| ID    | Severity | Accepted? | Resolution                                                                                                                                                               |
| ----- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-001 | P2       | Yes       | Replaced the failing package-scoped example test guidance with the verified `pnpm build` then `pnpm test:example` clean-checkout sequence.                               |
| F-002 | P2       | Yes       | Restored the master beginner README title, introduction, feature list, and quick-start structure; separated the tests-only configuration fixture from console scenarios. |
| F-003 | P2       | Yes       | Expanded the option workflow around real `(when)` Proto, generated extension, registry, owner, validation ordering, fixture, and Vitest paths.                           |
| F-004 | P2       | Yes       | Added a real test-first `(when)` boundary-change example and removed generic executable-command placeholders.                                                            |
| F-005 | P2       | Yes       | Added ordered public API, example, documentation, and dependency maintenance workflows.                                                                                  |
| F-006 | P2       | Yes       | Rewrote human-facing contribution and development guidance without internal workflow terminology.                                                                        |
| F-007 | P2       | Yes       | Added explicit Ubuntu CI verification and Linux/macOS/WSL guidance, with native Windows clearly unverified.                                                              |
| F-008 | P2       | Yes       | Reduced the package README’s maintainer command list to concise guide links.                                                                                             |
| F-009 | P2       | Yes       | Made `BUILD_PROTOCOL.md` the canonical version rule and replaced duplicate policy copies with references.                                                                |
| F-010 | P2       | Yes       | Added `corepack enable pnpm` and cold-cache network guidance to clean-host setup sequences.                                                                              |

## Integration

- Task commits: Pending.
- Task push: Pending.
- `dev` merge: Pending.
- Post-merge verification: Pending.
- Remote refs: Pending.
- Worktree and task-branch cleanup: Pending.

## Open Risks And Follow-Up

| Risk                                                                                                          | Owner                  | Route                                                                                                                         | Disposition | Review point              |
| ------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------- |
| Copy-ready commands omit a required clean-checkout prerequisite.                                              | Implementation owner   | Run focused commands in the isolated worktree and reliability review                                                          | Open        | Before review convergence |
| Beginner documentation drifts into maintainer or internal terminology.                                        | Documentation reviewer | Fresh-reader questions and editorial review                                                                                   | Open        | Documentation review      |
| Maintained protocol still contradicts the pnpm/Vitest/ESM baseline.                                           | Implementation owner   | Targeted current-document scan and style review                                                                               | Open        | Before full gate          |
| Version metadata is mixed with unrelated documentation changes.                                               | Orchestrator           | Inspect the exact version commit tree and subject                                                                             | Open        | Before task push          |
| Repository-wide formatting includes a pre-existing active project-plan edit outside implementation ownership. | Orchestrator           | Format or disposition that edit before final verification                                                                     | Open        | Before full gate          |
| Package-scoped example test resolves no files because its Vitest include is rooted at the workspace.          | Maintainers            | Keep user guidance on the verified build-then-root-test sequence; change the package script only in a dedicated tooling task. | Open        | Future tooling work       |
