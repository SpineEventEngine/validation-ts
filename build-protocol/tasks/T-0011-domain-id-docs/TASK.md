# T-0011: Teach Domain ID Messages In Beginner Examples

Status: Approved
Classification: High-risk
Baseline: `a34056e7e7f6141116b20c9457863375786aed83`
Branch: `task/T-0011-domain-id-docs`
Worktree: `.worktrees/T-0011-domain-id-docs`
Approved plan: Human-approved domain-ID, beginner Proto documentation, example,
and deterministic-check plan on 2026-08-01

## Acceptance Criteria

- Model every domain identifier in the runnable example with a dedicated
  message: `UserId`, `ProductId`, and `CategoryId`, each containing a required
  string value.
- Type `User.id` and `GetUserRequest.user_id` as `UserId`, `Product.id` as
  `ProductId`, and `Category.id` as `CategoryId`; validate the ID value wherever
  an ID message is accepted and require each containing ID field.
- Update executable scenarios and assertions for the generated message shapes
  and reject both an absent ID field and a present ID message whose value is
  empty. Cover `GetUserRequest.user_id` directly.
- Preserve the structure and visual style of `packages/validation/README.md`
  while documenting every message and field in every Proto fence with simple
  terms from the example domain.
- Leave one empty line between documented Proto declaration blocks in the
  maintained README snippets and synchronized project-owned example schemas.
- Update `packages/example/README.md` and project-owned example Protos where
  they repeat the package-guide examples; keep all text suitable for complete
  beginners.
- Add deterministic documentation-checker coverage for README Proto comments,
  declaration-block spacing, and message-typed domain IDs.
- Preserve validation-library runtime behavior, public package exports,
  package versions, dependencies, immutable upstream Proto files, and the
  current README look and feel.
- Integrate only into `dev`, push the task and integration branches, verify
  remote refs, and remove the merged task branch locally and remotely without
  touching `master`.

## Human-Imposed Requirements Ledger

| Requirement                                                            | Source                     | Verification                                         |
| ---------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| No domain identifier in the example may be typed as a primitive.       | Human scope decision       | Proto scan, generated typecheck, example tests       |
| Document every message and every field.                                | Human item 2               | Deterministic fence checker and documentation review |
| Separate documented declaration blocks with one empty line.            | Human item 2               | Deterministic fence checker and source inspection    |
| Use simple terms from the respective domain and no internal jargon.    | Human item 2               | Beginner-reader test and documentation review        |
| Synchronize repeated README declarations with executable example code. | Human synchronization rule | README/schema comparison and example tests           |
| Preserve the README look and feel.                                     | Human presentation rule    | Diff inspection and documentation review             |
| Check correctness again for complete beginners.                        | Human final-check rule     | Focused checks, full gate, fresh reader test         |

## Skills

| Skill                            | Selected? | Reason                                                                                                    |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `using-git-worktrees`            | Yes       | Isolates the high-risk example Proto contract change from `dev`.                                          |
| `subagent-driven-development`    | Yes       | Uses one writer and a complete specialist review wave.                                                    |
| `test-driven-development`        | Yes       | Proves the new deterministic documentation and example behavior checks fail before implementation.        |
| `doc-coauthoring`                | Yes       | Preserves the existing guide while testing it with a fresh beginner reader.                               |
| `requesting-code-review`         | Yes       | Reviews the complete branch before integration.                                                           |
| `verification-before-completion` | Yes       | Requires fresh focused and canonical evidence before commits and delivery.                                |
| `implement`                      | No        | The approved project protocol and its dedicated implementer role define execution.                        |
| `domain-modeling`                | No        | The human already fixed the domain-ID rule and exact domain type names; no terminology discovery remains. |
| `monorepo-management`            | No        | Workspace topology, dependencies, and package management remain unchanged.                                |

## Agent Dispatch

| Role/function                  | Agent ID                     | Expected model  | Expected reasoning | Scope                                                                                               | Status   |
| ------------------------------ | ---------------------------- | --------------- | ------------------ | --------------------------------------------------------------------------------------------------- | -------- |
| Requirements split             | `/root/t0011_requirements`   | `gpt-5.6-sol`   | high               | Confirm ordered slices and high-risk acceptance coverage                                            | Complete |
| Implementation                 | `/root/t0011_implementation` | `gpt-5.6-terra` | medium             | Own checker tests/tooling, maintained READMEs, example Protos, scenarios, tests, and active records | Running  |
| Style/maintainability review   | Pending dispatch             | `gpt-5.6-terra` | high               | Naming, schema organization, checker maintainability, and diff scope                                | Pending  |
| Documentation review           | Pending dispatch             | `gpt-5.6-terra` | medium             | Beginner reader test, simple domain wording, completeness, spacing, and presentation                | Pending  |
| TypeScript/API review          | Pending dispatch             | `gpt-5.6-terra` | high               | Generated message shapes, serialized example compatibility, and unchanged package API               | Pending  |
| Performance/reliability review | Pending dispatch             | `gpt-5.6-terra` | high               | Deterministic checker behavior, gate coverage, generation, and delivery                             | Pending  |
| Security review                | N/A                          | `gpt-5.6-terra` | high               | No dependency, credential, publishing, trust-boundary, or runtime-input security change             | N/A      |

## Scope And Ownership

- One implementation owner may change `packages/validation/README.md`,
  `packages/example/README.md`, project-owned example Protos, example scenarios
  and tests, documentation checker code/tests, current T-0011 records, and the
  active project-plan row.
- The orchestrator owns worktree creation, review aggregation, full
  verification, integration, remote synchronization, and cleanup.
- Immutable files under example and validation `proto/spine/` trees must remain
  byte-for-byte unchanged.
- Excluded: validation runtime semantics, public validation-package exports,
  dependencies, package versions, CI, publication, and `master`.

## Decisions And Questions

- All three example domains use string-backed ID messages. Validation options
  formerly attached to primitive ID fields move to the corresponding ID value
  or to required/nested validation on the containing field.
- `UserId.value` and `CategoryId.value` gain only the approved required-string
  rule; no unapproved numeric-string format is invented. `ProductId.value`
  retains the existing `prod-[0-9]+` pattern.
- README Proto comments document domain meaning; they do not explain generator,
  descriptor, task, or implementation mechanics.
- `oneof` declarations and enum values remain documented and spaced consistently
  even though the minimum human rule names messages and fields.
- The example-only serialized schema changes do not alter the public npm
  package contract, but the field-kind changes warrant high-risk verification.
- No unresolved human question remains.

## Verification

| Command                                                   | Result                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline `corepack pnpm verify` through example execution | Passed 320 tests and all preceding gates; package smoke required network access.                                                                                                                 |
| Baseline network-enabled `corepack pnpm package:check`    | Passed; packed 112 files and loaded the installed ESM consumer.                                                                                                                                  |
| Baseline `corepack pnpm git:check`                        | Passed.                                                                                                                                                                                          |
| T-0011 focused implementation checks                      | Passed `generate`, checker tests/checker, example tests (10), immutable Proto verification (12 files), Proto lint, generated typecheck, build, source check, formatting, and `git diff --check`. |

Coverage: baseline 94.86% statements, 91.68% branches, 99.19% functions, and
96.12% lines.

## Review Dispositions

| Concern                 | Reviewer | Disposition | Evidence                      |
| ----------------------- | -------- | ----------- | ----------------------------- |
| Style/maintainability   | Pending  | Pending     |                               |
| Documentation           | Pending  | Pending     |                               |
| TypeScript/API          | Pending  | Pending     |                               |
| Performance/reliability | Pending  | Pending     |                               |
| Security                | N/A      | N/A         | No security boundary changes. |

## Findings

| ID  | Severity | Accepted? | Resolution |
| --- | -------- | --------- | ---------- |

## Integration

- Task commit:
- Task push:
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:

## Open Risks And Follow-Up

| Risk                                                                              | Owner  | Route                                                                                                                              | Disposition | Review point                            |
| --------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| Message-kind changes alter the example's serialized field wire types.             | T-0011 | Regenerate and compile every consumer; document the example-only boundary.                                                         | In scope    | TypeScript/API review and full gate     |
| A present ID message with an empty value is the generated default nested message. | T-0011 | Preserve runtime behavior: `(required)` reports the containing ID field and recursive validation skips the default nested message. | Accepted    | Example tests and TypeScript/API review |
