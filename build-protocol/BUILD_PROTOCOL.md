# Build Protocol

This protocol governs autonomous development of
`@spine-event-engine/validation` with Codex, subagents, Git worktrees, and the
`dev` integration branch.

## Authority

Apply sources in this order:

1. current explicit human instructions and approved plan;
2. accepted entries in `DECISION_LOG.md`;
3. the active task record and technical specification;
4. this protocol and `CODE_QUALITY.md`;
5. historical logs.

When sources conflict and the higher authority does not resolve the result,
record a blocking question and stop.

## Prime Directive

Work must remain resumable after interruption. Record each meaningful boundary
in the task and work logs in the same change as the work it describes:

1. framing, approval, classification, and ownership;
2. implementation and focused verification;
3. complete review-wave findings and dispositions;
4. corrections and converged review; and
5. integration, post-merge verification, and remote synchronization.

Human-imposed requirements are binding invariants. Standard and high-risk task
records contain a ledger quoting or precisely linking every applicable rule.

## Approval Boundary

Before implementation, the orchestrator:

1. inspects actual code, documentation, Git state, and relevant external
   contracts;
2. asks questions only when an answer materially changes the result;
3. proposes a concrete implementation and verification plan; and
4. waits for explicit human approval.

After approval, continue autonomously. Do not ask about routine reversible
choices inside the plan.

## Roles And Models

Use the project roles under `.codex/agents/`. Do not invent or rename roles.

| Function                                                                   | Model           | Reasoning |
| -------------------------------------------------------------------------- | --------------- | --------- |
| Main orchestration                                                         | `gpt-5.6-sol`   | medium    |
| Architecture-significant splitting and public-contract planning            | `gpt-5.6-sol`   | high      |
| TypeScript implementation and bounded correction                           | `gpt-5.6-terra` | medium    |
| Mechanical verification, documentation, dependencies, and repository scans | `gpt-5.6-terra` | medium    |
| Correctness, compatibility, API, reliability, and security review          | `gpt-5.6-terra` | high      |

Every dispatch supplies model and reasoning explicitly and records the expected
values before the result is accepted. Record actual runtime metadata when the
surface exposes it. Lack of self-introspection is a limitation, not a failure,
when immutable dispatch values are available.

The requirements splitter is selective. Invoke it only for:

- a new subsystem or public package boundary;
- public or serialized contract changes;
- validation-option semantics;
- security, persistence, concurrency, idempotency, or destructive behavior;
- a demonstrated architectural blocker.

Ordinary fixes use a short orchestrator plan. Mechanical verification is a
function, not another agent identity.

## Concurrency And Ownership

- Subagents must not spawn subagents.
- Use the surface's available capacity; no project-specific numerical cap is
  imposed beyond `.codex/config.toml`.
- Only one writer owns overlapping production files.
- Parallelize independent read-only research, test analysis, mechanical
  verification, and specialist review.
- Reviewers receive distinct concerns over an immutable diff basis.
- Collect the complete review wave before sending one deduplicated correction
  batch.
- Return corrections to the existing implementation context when available.
- Close each child immediately after the role completes.

## Task Classification

### Micro

A micro task changes documentation, comments, formatting, or task metadata,
normally within three files and 150 non-generated lines. It does not change
runtime behavior, public or serialized contracts, generated artifacts,
dependencies, shared tooling, publishing, security, or user workflows.

The orchestrator may implement it directly. Use one combined micro record,
deterministic checks, and relevant review dispositions.

### Standard

A standard task is bounded runtime, test, example, documentation, or tooling
work without a high-risk boundary. Use one implementation owner, focused
checks, a complete relevant review wave, and one aggregated correction batch.

### High-Risk

A high-risk task changes:

- public npm names, exports, declarations, or serialized Proto contracts;
- validation semantics or compatibility guarantees;
- dependency/publishing security;
- destructive behavior or migrations;
- persistence, concurrency, idempotency, or lifecycle ownership; or
- architecture spanning multiple subsystems.

Use Sol High planning when the selective trigger applies, Terra High review
for the affected risk, focused regression evidence, and the full verification
gate. A task may be promoted at any time and may not be demoted after
implementation to avoid a gate.

## Work Breakdown

1. Reconcile `dev`, remotes, dirty state, and active records.
2. Record acceptance criteria, classification, ledger, selected skills, and
   high-risk assumptions.
3. Split architecture-significant work into reviewable slices.
4. Create one traceable task branch and worktree from current `dev`.
5. Give one implementation owner the write scope and behavior tests.
6. Run the narrowest useful checks during implementation.
7. Run the pre-review diff/docs/status scan.
8. Dispatch relevant review roles concurrently.
9. Aggregate and classify findings, then assign one correction batch.
10. Re-run affected checks and only substantively affected review concerns.
11. Run the full gate when required.
12. Commit, push the task branch, merge to `dev`, post-merge verify, push
    `dev`, confirm remote refs, close agents, and remove the clean worktree.

## Branch And Worktree Rules

- `master` is release-only and changes only after an explicit human request
  for a PR into `master`.
- `dev` is the integration branch.
- Branches use `task/<id>-<slug>` and start from up-to-date `dev`.
- Worktrees live under ignored `.worktrees/`.
- Never share overlapping file ownership.
- Never force-remove a dirty worktree.
- Do not merge before review converges and logs are current.
- Preserve unrelated user changes and ignored local files.

## Remote Synchronization

After a task is complete and merged to `dev`:

1. push the completed task branch to `origin`;
2. push updated `dev`;
3. push task tags, if any;
4. inspect remote refs and prove the intended commits match; and
5. record the remote state at the existing closure boundary.

Do not push or merge `master` without an explicit human request. A push to
`master` intentionally invokes the repository's automatic npm publication.

Diagnose authentication, network, policy, and non-fast-forward failures without
rewriting or losing local history. Remote inability becomes a blocker only
after safe in-scope recovery is exhausted.

## Skills

The orchestrator performs one task-level applicability check before governed
action:

1. inspect the exposed skill inventory and
   `skills/EXPECTED_SKILLS.md`;
2. select task-relevant skills by metadata before reading bodies;
3. read every selected `SKILL.md` fully;
4. record selected and apparently relevant skipped skills with reasons;
5. pass concise applicable instructions to children; and
6. repeat only when scope, role, or available inventory materially changes.

Skills are advisory workflow inputs. They cannot override the approved plan,
project protocol, sandbox, approvals, or human authorization.

Before choosing or upgrading a dependency, verify its current stable release,
maintenance, TypeScript/Node support, and compatibility. Record the decision.
Do not implement common infrastructure before checking existing libraries.

## Review Loop

Every task records a disposition for:

- style/maintainability;
- documentation completeness;
- TypeScript/public API;
- performance/reliability.

Invoke a reviewer only when its concern can be affected. Otherwise record a
concrete N/A reason. Security is a final release-readiness role unless the
human explicitly requests it earlier or the approved task is itself a
security review.

Before review, inspect the diff and task records for:

- stale status or missing evidence;
- accidental public exports or package-name remnants;
- duplicated policy values;
- documentation claims not supported by code;
- modifications to immutable vendored Proto files;
- unrelated user changes.

Classify findings:

- **P0 critical:** active data loss, security compromise, corruption, or
  availability failure.
- **P1 major:** required behavior or public contract is wrong, or essential
  regression coverage is missing.
- **P2 task-scope:** a concrete maintainability, documentation, API,
  reliability, or test defect introduced or exposed by this task.
- **P3 advisory:** optional polish, preference, or unchanged baseline debt.

Wait for the complete wave, deduplicate, and accept or reject each finding with
a reason. P0/P1 block acceptance. Resolve every accepted P2. Record P3 without
expanding scope.

Run at most two complete review waves. Corrections reopen only substantively
affected lanes. Continue beyond that limit only for unresolved P0/P1 risk or
explicit human direction.

Review converges when no P0/P1 remains, accepted P2 findings are resolved, P3
and rejected findings are recorded, and every canonical concern has a clean,
accepted, or justified N/A disposition.

## Verification

Use focused tests in inner loops. Run `pnpm verify` once after review
converges when runtime code, tests, public contracts, dependencies, generated
artifacts, publishing, CI, or shared tooling changes.

The full gate must cover:

- pinned Node compatibility;
- deterministic dependency installation through the committed lockfile;
- Protobuf generation and immutable-source provenance;
- TypeScript build/typechecking;
- ESLint and formatting;
- Vitest tests and coverage;
- TypeDoc/API generation;
- project-owned Proto lint;
- generated-output cleanliness;
- published-package contents and an installable consumer smoke test; and
- `git diff --check`.

Coverage initially enforces:

- statements: 80%;
- lines: 80%;
- branches: 70%;
- functions: 90%.

Substantial behavioral expansion waits until every metric is at least 90%.
Exceptions require an accepted decision and explicit human approval.

After merge, repeat the full gate only when integration changed the verified
tree, shared build/dependency/generated infrastructure changed, or high-risk
integration warrants it. Otherwise prove tree equality and run focused checks.

## Immutable Proto Intake

For each upstream file:

1. resolve the upstream branch to a commit;
2. retrieve the raw file at that commit;
3. record repository, commit, source path, raw URL, retrieval date, local path,
   and SHA-256;
4. compare the vendored file byte-for-byte;
5. exclude only the immutable upstream file from incompatible style rules; and
6. continue to compile/generate it and validate its provenance.

Never edit a frozen Proto to make Buf lint pass. Lint project-owned Proto files
normally. A changed checksum requires an explicit intake task and review.

## Logging

Standard and high-risk task records include:

- task ID, status, classification, baseline, branch, and worktree;
- approved plan and human requirements ledger;
- selected skills and child dispatch metadata;
- decisions and questions;
- file ownership and changed files;
- commands, tests, coverage, and limitations;
- review waves and finding dispositions;
- integration, remote refs, and next action.

Keep chronological commands in `work-logs/` and immutable review evidence in
`reviews/`. Never record credentials, tokens, auth headers, sensitive payloads,
or unnecessary local personal paths.

## Framework Version Changes

Every root framework-version change must be an isolated version-only commit.
Only the `version` fields in root `package.json`,
`packages/validation/package.json`, and `packages/example/package.json` may
change in that commit; they change together. Its exact subject is
`Bump version -> <version>`.

Do not create record-only commits merely to name the immediately preceding
commit. Git history is durable evidence.

## Blockers

Stop and ask the human only when:

- a product or public-contract choice is genuinely human-owned and unresolved;
- a required external source or dependency remains unavailable after approved
  attempts;
- repository corruption or conflicting user-owned changes prevent safe work;
- required authority would expand the approved scope materially; or
- a final security residual requires explicit risk acceptance.

Test failures, coverage gaps, review findings, merge conflicts, difficult
implementation, and ordinary tooling failures are not blockers. Diagnose,
correct, and continue.

## Completion

A task is complete only when:

- acceptance criteria and the approved plan are satisfied;
- affected docs and API reference are current;
- relevant focused checks and the required full gate pass;
- review converges;
- every child is closed;
- the task branch and `dev` are pushed and remote refs verified;
- the merged worktree is clean and safely removed; and
- durable records identify evidence, limitations, and the next milestone.
