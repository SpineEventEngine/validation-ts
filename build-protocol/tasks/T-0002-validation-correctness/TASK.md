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

| Role/function                  | Agent ID                   | Expected model  | Expected reasoning | Scope                                                                          | Status                                     |
| ------------------------------ | -------------------------- | --------------- | ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Requirements splitting         | `/root/requirements_split` | `gpt-5.6-sol`   | high               | Split the approved high-risk contract work into ordered implementation slices  | Complete and closed                        |
| TypeScript implementation      | `/root/implementer`        | `gpt-5.6-terra` | medium             | Own all overlapping production code and focused behavior tests                 | Task 1 complete and closed                 |
| Task 1 scoped review           | `/root/task1_review`       | `gpt-5.6-terra` | high               | Contract-kernel spec compliance and code quality                               | Approved after F-001 through F-003; closed |
| Style/maintainability review   | Pending dispatch           | `gpt-5.6-terra` | high               | Whole task diff and maintainability                                            | Pending                                    |
| Documentation review           | Pending dispatch           | `gpt-5.6-terra` | medium             | Proto-aligned claims and unresolved regex status                               | Pending                                    |
| TypeScript/API review          | Pending dispatch           | `gpt-5.6-terra` | high               | Public error, declarations, Buf compatibility, serialized violation shape      | Pending                                    |
| Performance/reliability review | Pending dispatch           | `gpt-5.6-terra` | high               | Ordering, recursion, cache behavior, equality cost, deterministic verification | Pending                                    |

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
| `npm run verify`                 | Pending                                                                                                        |

Coverage: fresh T-0002 baseline is 81.88% statements, 71.01% branches, 92.18%
functions, and 81.48% lines.

## Review Dispositions

| Concern                 | Reviewer | Disposition                                                                               | Evidence |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------- | -------- |
| Style/maintainability   | Pending  | Pending                                                                                   |          |
| Documentation           | Pending  | Pending                                                                                   |          |
| TypeScript/API          | Pending  | Pending                                                                                   |          |
| Performance/reliability | Pending  | Pending                                                                                   |          |
| Security                | N/A      | The task is not a release or security review and does not add an external trust boundary. | D-0004   |

## Findings

| ID    | Severity | Accepted? | Resolution                                                                                                                                      |
| ----- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001 | P1       | Yes       | Resolved in `d4a3f3c`; message-level constraints now use optional field context, an empty present path, `${message.type}`, and no packed value. |
| F-002 | P1       | Yes       | Resolved in `d2eb687`; descriptor metadata remains present for an absent value while `${field.value}` and packed `fieldValue` remain absent.    |
| F-003 | P1       | Yes       | Resolved in `4848a4c`; scalar, list-scalar, and map-scalar `${field.type}` values use canonical Proto spellings.                                |

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
