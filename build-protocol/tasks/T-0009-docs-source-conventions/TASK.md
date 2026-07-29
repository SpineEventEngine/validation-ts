# T-0009: Restore Package Guidance And Source Conventions

Status: Ready for integration
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

| Role/function                  | Expected model                                                                                                                                                                                                                                                                    | Expected reasoning | Scope                                                                                                                       | Status   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| Requirements split             | `/root/t0009_requirements`; `gpt-5.6-sol`                                                                                                                                                                                                                                         | high               | Order public API, source ownership, documentation, and deterministic-gate slices                                            | Complete |
| Implementation                 | `/root/t0009_implementer`, `/root/t0009_core_owner`, `/root/t0009_options_a`, `/root/t0009_options_b`, `/root/t0009_tsdoc_fix`, `/root/t0009_tsdoc_owner`, `/root/t0009_docs_fix`, `/root/t0009_tsdoc_final`, `/root/t0009_gate_owner`, `/root/t0009_review_fix`; `gpt-5.6-terra` | medium             | Sequentially own the public/example, core, option, documentation, gate-integration, and accepted-review correction tranches | Complete |
| Style/maintainability review   | `/root/t0009_style_review`; `gpt-5.6-terra`                                                                                                                                                                                                                                       | high               | Ownership, naming, checker quality, and behavior preservation                                                               | Complete |
| Documentation review           | `/root/t0009_docs_review`; `gpt-5.6-terra`                                                                                                                                                                                                                                        | medium             | Restored guide, development reference, TSDoc, Proto comments, and links                                                     | Complete |
| TypeScript/API review          | `/root/t0009_api_review`; `gpt-5.6-terra`                                                                                                                                                                                                                                         | high               | Export removal, `Violations` API, declarations, TypeDoc, and package surface                                                | Complete |
| Performance/reliability review | `/root/t0009_reliability_review`; `gpt-5.6-terra`                                                                                                                                                                                                                                 | high               | Deterministic checkers, verification integration, and bounded scans                                                         | Complete |
| Security review                | `gpt-5.6-terra`                                                                                                                                                                                                                                                                   | high               | No new trust boundary, dependency, publishing, or security-sensitive behavior expected                                      | N/A      |

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

| Command                                         | Result                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Baseline `pnpm install --frozen-lockfile`       | Passed with the committed lockfile.                                                                               |
| Baseline canonical gate                         | Passed through the example; the package smoke check required network access for its temporary consumer install.   |
| Baseline `pnpm package:check && pnpm git:check` | Passed with network access: packed 112 files and loaded the installed ESM API.                                    |
| Final `pnpm package:check`                      | Passed with network access: packed 112 files, compiled the installed public declarations, and loaded the ESM API. |
| Final independent `pnpm verify`                 | Passed all canonical checks, 320 tests, immutable-source verification, documentation, package, and Git gates.     |

Final coverage: 94.86% statements, 91.68% branches, 99.19% functions, and
96.12% lines across 18 files and 320 tests.

## Review Dispositions

| Concern                 | Reviewer                         | Disposition | Evidence                                                                                                 |
| ----------------------- | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| Style/maintainability   | `/root/t0009_style_review`       | Clean       | Entry-point and callable-property checks re-reviewed clean; ownership, naming, and runtime order passed. |
| Documentation           | `/root/t0009_docs_review`        | Clean       | Install, message-option, time, TSDoc, Proto, link, and package/development-reference scopes passed.      |
| TypeScript/API          | `/root/t0009_api_review`         | Clean       | Installed declarations and runtime expose the intended API; removed exports and mismatched pairs reject. |
| Performance/reliability | `/root/t0009_reliability_review` | Clean       | Shell, path, comment, ordering, tokenizer, generation, and runtime concerns re-reviewed clean.           |
| Security                | N/A                              | N/A         | No new dependency, trust boundary, publishing behavior, or security-sensitive runtime input.             |

## Findings

| ID    | Severity | Accepted? | Resolution                                                                                                         |
| ----- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| T9-R1 | P2       | Yes       | Restricted the standalone `validate` exception to its single public declaration and added path/count fixtures.     |
| T9-R2 | P2       | Yes       | Enforced callable TSDoc for class and object function-valued properties with positive and negative fixtures.       |
| T9-R3 | P2       | Yes       | Documented `(if_missing)` and `(if_has_duplicates)` custom-message ownership and the TypeScript 5.4 minimum.       |
| T9-R4 | P2       | Yes       | Added an installed TypeScript consumer that proves current APIs, removed exports, and schema/message pairing.      |
| T9-R5 | P1       | Yes       | Rejected shell chaining, background operators, and continuations in one-command install fences.                    |
| T9-R6 | P1       | Yes       | Rejected empty TypeScript and project-owned Proto documentation comments.                                          |
| T9-R7 | P2       | Yes       | Confined local documentation links to the real repository tree, including traversal and symlink cases.             |
| T9-R8 | P2       | Yes       | Sorted Markdown, package-documentation, and source-TSDoc traversal and added deterministic first-failure fixtures. |

## Open Risks And Follow-Up

| Risk                                                                    | Owner                  | Route                                                    | Disposition |
| ----------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- | ----------- |
| Broad helper regrouping accidentally changes runtime order or values.   | Implementation owner   | API/runtime regression tests and full coverage gate      | Closed      |
| Automated prose checks accept meaningless text or reject valid wording. | Implementation owner   | Narrow deterministic rules plus documentation review     | Closed      |
| Proto comment parsing mishandles nested or multiline declarations.      | Implementation owner   | Tokenizer fixtures and complete maintained-source scan   | Closed      |
| Restored historical instructions reintroduce obsolete behavior.         | Documentation reviewer | Compare every guide claim with current code and examples | Closed      |
| Moving docs leaves broken links or unpublished-package links.           | Implementation owner   | Link checker, package-content check, and review          | Closed      |

## Implementation Evidence

| Boundary                        | Outcome                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final TSDoc correction audit    | Replaced all reported generic, history, and duplicate TSDoc blocks in the owned source inventory; internal all-fields adapter naming now describes behavior without changing the public API.                                                                                                                                  | Exact banned-word and adjacent-block inventory scans returned no matches.                                                                                                                                                                                                                                                                                                               |
| Checker regression coverage     | Added RED fixtures for generic filler, detached history wording, and duplicate declaration blocks; hardened scanning to inspect every TSDoc block and emit deterministic duplicate diagnostics.                                                                                                                               | Initial `node --test scripts/check-source-conventions.test.mjs` failed at the new fixture; it passed after the checker change.                                                                                                                                                                                                                                                          |
| Focused source convention gate  | Passed after the complete inventory remediation.                                                                                                                                                                                                                                                                              | `pnpm source:check`                                                                                                                                                                                                                                                                                                                                                                     |
| Final correction verification   | Passed TypeDoc/document checks, generated typechecking, lint/format, all validation and example tests, checker fixtures, and whitespace validation after the internal adapter test call was renamed.                                                                                                                          | `pnpm docs:check`; `pnpm typecheck`; `pnpm lint`; `pnpm format:check`; `pnpm test:validation`; `pnpm test:example`; `node --test scripts/check-source-conventions.test.mjs`; `git diff --check`                                                                                                                                                                                         |
| Task 5 RED package smoke        | Attempted the pre-change package check. The stale smoke still required removed `formatViolations`, but the temporary consumer install did not reach the smoke because the sandbox could not resolve registry packages.                                                                                                        | `pnpm package:check` stopped during `pnpm add` with `ENOTFOUND` for `temporal-polyfill`, `temporal-utils`, and `temporal-spec`; no checker or package metadata was changed before this observation.                                                                                                                                                                                     |
| Task 5 GREEN gate integration   | Updated the package contract smoke to require callable `validate`, `ValidationConfigurationError`, and `Violations` format/path methods, reject both removed exports, reject packed `docs/`, and run `source:check` before lint/docs in `verify`.                                                                             | `pnpm source:check`; `pnpm docs:check`; `pnpm proto:verify`; `pnpm proto:lint`; `pnpm typecheck:generated`; `pnpm lint`; `pnpm test:coverage`; `pnpm proto:check-generated`; `pnpm git:check`; `git diff --check` passed. The first package rerun hit registry DNS; the final network-enabled package and canonical gates passed.                                                       |
| Consolidated review corrections | Accepted P1/P2 findings corrected: package guidance names the nested required/distinct message options and TypeScript prerequisite; source and documentation checkers reject the reviewed bypasses deterministically; installed-consumer smoke compiles the tarball public types. Corrections were sent to focused re-review. | RED/GREEN fixture runs: `node --test scripts/check-source-conventions.test.mjs` and `node scripts/check-documentation.test.mjs`; the canonical `pnpm verify` passed, including the installed-tarball runtime and TypeScript smoke. Coverage: 94.86% statements, 91.68% branches, 99.19% functions, and 96.12% lines.                                                                    |
| Re-review correction follow-up  | Added object-literal callable coverage, unquoted background-operator rejection, deterministic source-TSDoc traversal, and distinct `GenMessage` schema/message smoke types. The affected lanes were sent to final narrow re-review.                                                                                           | `node --test scripts/check-source-conventions.test.mjs`; `node scripts/check-documentation.test.mjs`; `pnpm source:check`; `pnpm docs:check`; `pnpm typecheck`; `pnpm lint`; `pnpm format:check`; `pnpm test:validation`; `pnpm test:example`; `git diff --check`; `pnpm git:check` passed. The first package attempt hit registry DNS; the final network-enabled package check passed. |
| Final review and gate           | Every accepted finding was corrected and re-reviewed clean; the installed tarball's declaration/runtime smoke and canonical gate passed with network access.                                                                                                                                                                  | `pnpm package:check` packed 112 files and verified the installed consumer; final `pnpm verify` passed 320 tests and every canonical gate.                                                                                                                                                                                                                                               |
