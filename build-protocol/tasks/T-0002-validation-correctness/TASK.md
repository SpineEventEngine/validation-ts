# T-0002: Correct Validation Semantics And Reach 90% Coverage

Status: In progress
Classification: High-risk
Baseline: `09b94d03828fb6f1ed264398dced327dbdaa67b5`
Branch: `task/t-0002-validation-correctness`
Worktree: `.worktrees/t-0002-validation-correctness`
Approved plan: Human approval in the Codex task on 2026-07-24

## Acceptance Criteria

- `validate(schema, message)` emits violations in deterministic field-declaration
  order, with a stable validator order within each field.
- All affected violations use the root validation-entry type, the complete
  Proto field path, a correctly packed `field_value`, and the documented
  default or custom message placeholders.
- Missing custom and default messages produce a present, empty
  `TemplateString`; they do not throw and do not invent fallback wording.
- `ValidationConfigurationError` is public and exposes a stable `code`,
  `option`, `typeName`, optional `fieldPath`, and optional `cause`.
- `(required)`, `(require)`, `(goes)`, `(choice)`, `(min)`, `(max)`, and
  `(range)` follow the frozen `spine/options.proto` documentation for the
  implemented option surface.
- `(distinct)` emits one violation per duplicated equality class. It uses
  Buf's Protobuf equality, keeps the collection field path, packs the
  duplicate as `field_value`, supplies the full collection as
  `${field.value}`, and supplies a singleton duplicate list as
  `${field.duplicates}`.
- `(validate)` propagates leaf violations only, preserving the root type and
  prefixing the complete nested field path for singular, repeated, map, and
  supported `Any` values.
- Java `Pattern` compatibility is not changed in this task and is recorded as
  an advisory unresolved question. Documentation does not claim full parity.
- Global Jest coverage is at least 90% for statements, branches, functions,
  and lines, enforced by committed thresholds.
- Relevant focused checks, specialist review, and `npm run verify` pass before
  integration. The task branch and merged `dev` are pushed and remote refs are
  verified. `master` remains untouched.

## Human-Imposed Requirements Ledger

| Requirement                                                                                              | Source                           | Verification                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| Proto-defined behavior overrides known-wrong snapshot behavior.                                          | Human decision in the Codex task | Contract tests against frozen Proto documentation |
| Violation order follows field declaration order; exact ordering is not a public compatibility guarantee. | Human decision in the Codex task | Multi-field ordering tests                        |
| `[A, A, A, A, B, B, C]` produces one duplicate violation for `A` and one for `B`.                        | Human decision in the Codex task | Repeated and map distinct tests                   |
| Buf equality must compare Protobuf messages.                                                             | Human decision in the Codex task | Structural message and bytes duplicate tests      |
| Nested validation follows JVM tests and emits leaf violations only.                                      | Human decision in the Codex task | Nested singular/repeated/map/Any tests            |
| `ValidationConfigurationError` exposes structured public diagnostics.                                    | Human decision in the Codex task | TypeScript API and runtime tests                  |
| A missing `default_message` emits an empty diagnostic because the JVM accepts it.                        | Human decision in the Codex task | Empty-template regression test                    |
| Java-regex compatibility is postponed and must be written down as an open question.                      | Human decision in the Codex task | `questions/UNRESOLVED.md` and public docs         |
| Do not integrate a large regex dependency or build a project-owned regex engine in this task.            | Human decision in the Codex task | Dependency and diff review                        |
| Reach at least 90% in every coverage dimension.                                                          | Human decision and D-0006        | Final coverage output and thresholds              |
| Keep npm, Jest, and CommonJS until separately approved migrations.                                       | Human decision from T-0001       | Package/tooling diff review                       |
| Work from `dev`; do not merge or push `master`.                                                          | Human decision and branch policy | Git history and remote-ref verification           |

## Skills

| Skill                            | Selected? | Reason                                                                                            |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `codebase-design`                | Yes       | Place ordering, diagnostics, equality, and recursion behind a deep internal validation interface. |
| `using-git-worktrees`            | Yes       | High-risk work requires an isolated task branch and worktree.                                     |
| `implement`                      | Yes       | Execute the approved runtime and test changes.                                                    |
| `test-driven-development`        | Yes       | Every semantic correction begins with a focused failing behavior test.                            |
| `subagent-driven-development`    | Yes       | Execute reviewable slices with one production-code writer and task review.                        |
| `requesting-code-review`         | Yes       | Required per-slice and whole-branch review.                                                       |
| `verification-before-completion` | Yes       | Fresh evidence is required before commits, integration, and completion claims.                    |
| `executing-plans`                | No        | This task remains in the current session; subagent-driven development is the matching workflow.   |
| `openai-docs`                    | No        | No Codex configuration or OpenAI product guidance changes.                                        |

## Agent Dispatch

| Role/function                  | Agent ID                        | Expected model  | Expected reasoning | Scope                                                                          | Status                                     |
| ------------------------------ | ------------------------------- | --------------- | ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Requirements splitting         | `/root/requirements_split`      | `gpt-5.6-sol`   | high               | Split the approved high-risk contract work into ordered implementation slices  | Complete and closed                        |
| TypeScript implementation      | `/root/implementer_nested`      | `gpt-5.6-terra` | medium             | Own Task 6 nested-validation production code and focused behavior tests        | Task 6 complete and closed                 |
| Task 1 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Contract-kernel spec compliance and code quality                               | Approved after F-001 through F-003; closed |
| Task 2 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Deterministic orchestration spec compliance and code quality                   | Approved after F-004 through F-006; closed |
| Task 3 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Presence semantics, diagnostics, configuration errors, and fixture migration   | Approved after F-007 through F-011; closed |
| Task 4 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Numeric grammar, precision, references, envelopes, and configuration errors    | Approved after F-012 through F-015; closed |
| Task 5 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Buf equality, duplicate classes, diagnostics, packing, and unsupported targets | Approved after F-016; closed               |
| Task 6 scoped review           | `/root/task1_review`            | `gpt-5.6-terra` | high               | Leaf recursion, root context, message paths, Any registry, and target errors   | Approved; closed                           |
| Task 7 implementation          | `/root/implementer_coverage`    | `gpt-5.6-terra` | medium             | Own branch-focused tests, Jest thresholds, README, and affected API comments   | Complete and closed                        |
| Style/maintainability review   | `/root/style_final`             | `gpt-5.6-terra` | high               | Whole task diff and maintainability                                            | Clean; F-017 resolved; closed              |
| Documentation review           | `/root/docs_final`              | `gpt-5.6-terra` | medium             | Proto-aligned claims and unresolved regex status                               | Clean; F-019 through F-022/F-025; closed   |
| TypeScript/API review          | `/root/api_final`               | `gpt-5.6-terra` | high               | Public error, declarations, Buf compatibility, serialized violation shape      | Clean; F-017/F-023 resolved; closed        |
| Performance/reliability review | `/root/reliability_final`       | `gpt-5.6-terra` | high               | Ordering, recursion, cache behavior, equality cost, deterministic verification | Clean; F-018/F-024 resolved; closed        |
| Final correction batch         | `/root/implementer_corrections` | `gpt-5.6-terra` | medium             | Resolve accepted whole-branch findings F-017 through F-025                     | Complete and closed                        |

## Scope And Ownership

- One implementation owner will own `packages/validation/src`,
  `packages/validation/tests`, coverage configuration, and directly affected
  documentation.
- The orchestrator owns task records, reviews, Git integration, verification,
  and remote synchronization.
- Review agents are read-only.
- Excluded: Java-regex compatibility changes, new regex dependencies,
  `spine/time_options.proto`, npm/Jest/CommonJS migration, publication, and
  all `master` changes.

## Decisions And Questions

- Use Buf `equals()` for message values and Buf `scalarEquals()` for scalar
  values in `(distinct)`.
- Keep a present empty `TemplateString` when no diagnostic text is available.
- Make violation creation a single internal responsibility shared by option
  implementations.
- Use the exact public error codes `UNSUPPORTED_OPTION_TARGET`,
  `INVALID_OPTION_VALUE`, `UNKNOWN_FIELD_REFERENCE`, and
  `INVALID_FIELD_REFERENCE`; canonical option names omit parentheses.
- `FieldPath` contains Proto field names only, never repeated indices or map
  keys.
- The ordered implementation slices are recorded in
  `IMPLEMENTATION_PLAN.md`.
- Questions: See `build-protocol/questions/UNRESOLVED.md`.

## Verification

| Command                          | Result                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Baseline `npm ci`                | Passed; 430 packages installed from the lockfile. Existing deprecation and allow-script warnings were emitted. |
| Baseline `npm test`              | Passed: 11 suites and 232 tests.                                                                               |
| Baseline `npm run test:coverage` | Passed: 11 suites and 232 tests; 81.88% statements, 71.01% branches, 92.18% functions, and 81.48% lines.       |
| Task 1 focused tests             | Passed: 2 suites and 9 tests; package TypeScript compilation and diff whitespace checks also passed.           |
| Task 2 focused tests             | Passed: affected wave 11 suites and 231 tests; independent focused wave 4 suites and 52 tests.                 |
| Task 3 focused tests             | Passed: focused presence 4 suites and 88 tests; full package 13 suites and 249 tests.                          |
| Task 4 focused tests             | Passed: focused 3 suites and 72 tests; full package 14 suites and 260 tests.                                   |
| Task 5 focused tests             | Passed: distinct 33 tests; full package 14 suites and 280 tests.                                               |
| Task 6 focused tests             | Passed: validate/integration 57 tests; full package 14 suites and 285 tests.                                   |
| Post-Task-6 coverage             | Passed tests; 92.23% statements, 87.37% branches, 94.17% functions, and 93.53% lines.                          |
| Task 7 90% coverage gate         | Passed: 94.72% statements, 91.44% branches, 98.05% functions, and 95.87% lines.                                |
| Final numeric focus              | Passed: 27 tests; generated typecheck and diff whitespace checks passed.                                       |
| `npm run verify`                 | Pending clean rerun after F-025.                                                                               |

Coverage: fresh T-0002 baseline is 81.88% statements, 71.01% branches, 92.18%
functions, and 81.48% lines.

## Review Dispositions

| Concern                 | Reviewer | Disposition                                                                               | Evidence  |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------- | --------- |
| Style/maintainability   | Clean    | F-017 resolved; no remaining actionable P0-P2 findings.                                   | `35df598` |
| Documentation           | Clean    | F-019 through F-022 resolved; affected public claims and examples are accurate.           | `35df598` |
| TypeScript/API          | Clean    | F-017 and F-023 resolved; no accidental recursive public API or circular import remains.  | `35df598` |
| Performance/reliability | Clean    | F-018 and F-024 resolved; numeric and recursion reliability concerns are clean.           | `dca5f17` |
| Security                | N/A      | The task is not a release or security review and does not add an external trust boundary. | D-0004    |

## Findings

| ID    | Severity | Accepted? | Resolution                                                                                                                                      |
| ----- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001 | P1       | Yes       | Resolved in `d4a3f3c`; message-level constraints now use optional field context, an empty present path, `${message.type}`, and no packed value. |
| F-002 | P1       | Yes       | Resolved in `d2eb687`; descriptor metadata remains present for an absent value while `${field.value}` and packed `fieldValue` remain absent.    |
| F-003 | P1       | Yes       | Resolved in `4848a4c`; scalar, list-scalar, and map-scalar `${field.type}` values use canonical Proto spellings.                                |
| F-004 | P1       | Yes       | Resolved in `b831f22`; `(choice)` is message-level with an empty `FieldPath`, with the oneof name only in `${group.path}`.                      |
| F-005 | P2       | Yes       | Resolved in `b831f22`; tests distinguish same-field validator order and exact repeated-element output order.                                    |
| F-006 | P1       | Yes       | Resolved in `b831f22`; strict packing is restored and the adapter selects an offender or no collection-level value.                             |
| F-007 | P1       | Yes       | Resolved in `b5d72a7`; enum presence requires a numeric non-zero value and missing enum coverage passes.                                        |
| F-008 | P2       | Yes       | Resolved in `b5d72a7`; required bytes/maps have empty/non-empty coverage and exact absence envelopes.                                           |
| F-009 | P2       | Yes       | Resolved in `b5d72a7`; goes companion errors and selected zero/false choice cases are covered.                                                  |
| F-010 | P2       | Yes       | Resolved in `95c520d`; all Task 3 production sources use the complete standard Apache header.                                                   |
| F-011 | P2       | Yes       | Resolved in `cd93dbf`; boolean rejection and the complete invalid require-grammar boundary are covered.                                         |
| F-012 | P1       | Yes       | Resolved in `4339341`; range diagnostics preserve declared text and annotate references in place.                                               |
| F-013 | P2       | Yes       | Resolved in `4339341`; the complete numeric edge matrix and full error assertions pass.                                                         |
| F-014 | P2       | Yes       | Resolved in `4339341`; rewritten min/max and range modules use the complete standard header.                                                    |
| F-015 | P2       | Yes       | Resolved in `d6dc7a3`; the numeric contract test uses the complete standard test header.                                                        |
| F-016 | P1       | Yes       | Resolved in `88bc9b3`; duplicate singleton diagnostics use `[A]`/`[B]` and deterministic list/map formatting.                                   |

## Integration

- Task commit:
- Task push:
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:

## Open Risks And Follow-Up

| Risk                                                                    | Owner                | Route                   | Disposition                                                | Review point                                                          |
| ----------------------------------------------------------------------- | -------------------- | ----------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Java `Pattern` and ECMAScript `RegExp` are not behaviorally equivalent. | Future approved task | Q-0001                  | Deferred by human; do not add an engine or dependency now. | After non-regex correctness work, before claiming full pattern parity |
| Recursive validation resource limits remain undefined.                  | Future approved task | Technical specification | Do not invent a limit in T-0002.                           | Before ready-for-use release                                          |
