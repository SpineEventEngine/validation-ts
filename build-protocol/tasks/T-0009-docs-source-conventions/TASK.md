# T-0009: Restore Package Guidance And Source Conventions

Status: Active
Classification: High-risk
Baseline: `1f39ab5d910a240d04283ada489b8f044c307475`
Branch: `task/T-0009-docs-source-conventions`
Worktree: `.worktrees/T-0009-docs-source-conventions`
Approved plan: Human-approved documentation, API, naming, and source-ownership
plan completed on 2026-07-29

## Acceptance Criteria

- Restore the full package guide from immediately before `23335b1` as an
  editorial baseline, then update it for the current package, toolchain,
  behavior, time options, error handling, and public API.
- Present exactly one command in every quick-install sequence. Put an exact
  preview-version command only in a clearly separate alternative section.
- Move the top-level maintained documentation under
  `packages/validation/docs/`. Make the package README the authoritative user
  guide and the package-local docs a repository-only development reference
  optimized for developers and agents.
- Remove task history, chat terminology, and implementation-history shorthand
  from reader-facing documentation and TSDoc. Keep workflow terminology only
  in explicitly internal protocol and contributor workflow artifacts.
- Document production and example TypeScript declarations completely. Callable
  summaries start with a third-person verb, every parameter and non-void return
  is documented, and types, interfaces, objects, properties, and constructors
  explain their purpose and inputs.
- Keep public `validate()` as the deliberate standalone entry point. Move other
  production and example standalone functions to documented owning objects.
- Remove the public `formatViolations` and `formatTemplateString` exports
  without a deprecation cycle. Provide public collection formatting through
  `Violations.formatAll()` and keep template substitution behind a documented
  internal owner.
- Keep project-owned TypeScript and Proto names to at most four semantic words,
  preferably three. Use local aliases for unavoidable generated names.
- Document every project-owned Proto message, field, enum, enum value, and
  oneof, including test fixtures. Never modify immutable upstream Proto files.
- Enforce documentation, naming, and standalone-function rules with tested,
  deterministic repository tooling based on the TypeScript compiler API and a
  small Proto tokenizer. Do not add Buf comment linting.
- Preserve runtime validation behavior, validator ordering, immutable Proto
  checksums, generated-source determinism, and at least 90% coverage in every
  dimension.
- Pass the canonical gate, specialist review, task/dev integration, remote
  synchronization, and branch cleanup without touching `master`.

## Human-Imposed Requirements Ledger

| Requirement                                                                                  | Source         | Verification                                          |
| -------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------- |
| Restore and update the former full package guide instead of replacing it.                    | Human task     | Historical comparison and documentation review        |
| Never present moving-tag and exact-version installs as commands to run together.             | Human task     | Documentation checker fixture and maintained-doc scan |
| Use reader-facing language in product docs and TSDoc.                                        | Human task     | Source checker and documentation review               |
| Complete TSDoc for callables, types, interfaces, objects, properties, and constructors.      | Human task     | TypeScript AST checker and TypeDoc validation         |
| Use standalone production/example functions only as a last resort.                           | Human task     | AST checker and style review                          |
| Limit project-owned TypeScript and Proto names to four semantic words.                       | Human task     | Deterministic naming checks                           |
| Document all project-owned Proto declarations without editing upstream files.                | Human task     | Proto checker plus immutable-source verification      |
| Do not use Buf comment linting.                                                              | Human decision | Configuration diff and focused checker tests          |
| Remove formatting helper exports without deprecation aliases.                                | Human decision | Package export/type tests                             |
| Move maintained docs into the validation package as an agent-oriented development reference. | Human task     | Link/navigation and package-content checks            |
| Integrate only into `dev`; do not touch `master`.                                            | Branch policy  | Remote-ref evidence                                   |

## Skills

| Skill                            | Selected? | Reason                                                                     |
| -------------------------------- | --------- | -------------------------------------------------------------------------- |
| `codebase-design`                | Yes       | Assign helper behavior to cohesive owners instead of superficial grouping. |
| `using-git-worktrees`            | Yes       | Isolate the broad source and documentation refactor.                       |
| `test-driven-development`        | Yes       | Establish failing convention and public-API checks before implementation.  |
| `subagent-driven-development`    | Yes       | Use the project implementer and specialist review roles continuously.      |
| `requesting-code-review`         | Yes       | Review each implementation slice and the complete branch.                  |
| `verification-before-completion` | Yes       | Require fresh focused and full-gate evidence before integration.           |

## Agent Dispatch

| Role/function                  | Expected model                                                                                                         | Expected reasoning | Scope                                                                                            | Status   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ | -------- |
| Requirements split             | `/root/t0009_requirements`; `gpt-5.6-sol`                                                                              | high               | Order public API, source ownership, documentation, and deterministic-gate slices                 | Complete |
| Implementation                 | `/root/t0009_implementer`, `/root/t0009_core_owner`, `/root/t0009_options_a`, `/root/t0009_options_b`; `gpt-5.6-terra` | medium             | Sequentially own the public/example, core, and option Task 2 tranches without concurrent writers | Active   |
| Style/maintainability review   | `gpt-5.6-terra`                                                                                                        | high               | Ownership, naming, checker quality, and behavior preservation                                    | Pending  |
| Documentation review           | `gpt-5.6-terra`                                                                                                        | medium             | Restored guide, development reference, TSDoc, Proto comments, and links                          | Pending  |
| TypeScript/API review          | `gpt-5.6-terra`                                                                                                        | high               | Export removal, `Violations` API, declarations, TypeDoc, and package surface                     | Pending  |
| Performance/reliability review | `gpt-5.6-terra`                                                                                                        | high               | Deterministic checkers, verification integration, and bounded scans                              | Pending  |
| Security review                | `gpt-5.6-terra`                                                                                                        | high               | No new trust boundary, dependency, publishing, or security-sensitive behavior expected           | N/A      |

## Scope And Ownership

- One implementation owner owns all overlapping production, example,
  documentation, Proto-comment, checker, configuration, and durable task-log
  changes.
- The orchestrator owns requirements splitting, review aggregation, final
  verification, Git integration, remote synchronization, and cleanup.
- The requirements splitter and reviewers are read-only and must not spawn
  subagents.
- Excluded: validation behavior changes, Java regular-expression compatibility,
  new dependencies, package-manager/test-runner/module-format changes,
  publication, `master`, generated-source hand editing, and immutable upstream
  Proto changes.

## Decisions And Questions

- `packages/validation/README.md` is the authoritative consumer guide.
- `packages/validation/docs/` is repository-only development reference
  material. Its index links back to the package README.
- Useful material from the former top-level user guide is incorporated into the
  restored package guide instead of preserving a second consumer guide.
- Explicitly internal workflow artifacts may use task and agent terminology.
  Product documentation and TSDoc may not use historical task language.
- Root and package quick-install sections use the moving `snapshot` tag. An
  exact version is presented only as a separately labelled alternative.
- Existing non-comment Buf checks remain in place. No Buf comment rules are
  added.
- No material human questions remain.

## Verification

| Command                                         | Result                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Baseline `pnpm install --frozen-lockfile`       | Passed with the committed lockfile.                                                                             |
| Baseline canonical gate                         | Passed through the example; the package smoke check required network access for its temporary consumer install. |
| Baseline `pnpm package:check && pnpm git:check` | Passed with network access: packed 112 files and loaded the installed ESM API.                                  |

Baseline coverage: 94.71% statements, 91.51% branches, 99.19% functions, and
95.96% lines across 17 files and 319 tests.

## Review Dispositions

| Concern                 | Reviewer | Disposition | Evidence                                                 |
| ----------------------- | -------- | ----------- | -------------------------------------------------------- |
| Style/maintainability   | Pending  | Pending     | Pending                                                  |
| Documentation           | Pending  | Pending     | Pending                                                  |
| TypeScript/API          | Pending  | Pending     | Pending                                                  |
| Performance/reliability | Pending  | Pending     | Pending                                                  |
| Security                | N/A      | N/A         | No new security-sensitive boundary is in approved scope. |

## Open Risks And Follow-Up

| Risk                                                                    | Owner                  | Route                                                    | Disposition |
| ----------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- | ----------- |
| Broad helper regrouping accidentally changes runtime order or values.   | Implementation owner   | API/runtime regression tests and full coverage gate      | Open        |
| Automated prose checks accept meaningless text or reject valid wording. | Implementation owner   | Narrow deterministic rules plus documentation review     | Open        |
| Proto comment parsing mishandles nested or multiline declarations.      | Implementation owner   | Tokenizer fixtures and complete maintained-source scan   | Open        |
| Restored historical instructions reintroduce obsolete behavior.         | Documentation reviewer | Compare every guide claim with current code and examples | Open        |
| Moving docs leaves broken links or unpublished-package links.           | Implementation owner   | Link checker, package-content check, and review          | Open        |
