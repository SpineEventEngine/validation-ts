# Validation TS Agent Instructions

## Canonical Workflow

`build-protocol/BUILD_PROTOCOL.md` is the canonical autonomous-development
workflow. `build-protocol/PROJECT_PLAN.md` records the active sequence, and
`build-protocol/TECHNICAL_SPEC.md` defines the current product boundary.

At the start of every task, reconcile the actual Git state and read the active
task record. Preserve unrelated user changes and ignored local files.

## Human Approval Boundary

For each user-supplied task:

1. inspect the relevant code, documentation, and repository state;
2. ask only questions whose answers materially affect the result;
3. propose a concrete implementation and verification plan;
4. wait for explicit human approval; and
5. after approval, execute autonomously until completion or a real blocker.

Do not pause for routine implementation choices covered by the approved plan.

## Progress Communication

Send a concise user-facing update after every subagent completion, verification
result, review result, merge, push, or real blocker. State the outcome, next
action, and whether work continues. Never wait silently while active work
remains.

## Model Allocation

Use Standard speed. Do not use Fast/boost mode, Max, or Ultra in the normal
cycle. Always set the model and reasoning explicitly for each child.

- Main orchestration: `gpt-5.6-sol`, medium reasoning.
- Architecture, requirements splitting, and difficult public-contract
  planning: `gpt-5.6-sol`, high reasoning.
- TypeScript implementation, bounded refactoring, mechanical verification,
  documentation research, and dependency checks: `gpt-5.6-terra`, medium
  reasoning.
- Correctness, compatibility, public API, reliability, or security review:
  `gpt-5.6-terra`, high reasoning.

Record expected dispatch metadata in the task or review log before accepting
child work. Runtime self-introspection is optional when the surface does not
expose it; explicit dispatch fields remain mandatory.

## Existing Roles

Use only the project roles defined under `.codex/agents/`:

- `requirements_splitter`
- `implementer`
- `style_maintainability_reviewer`
- `documentation_reviewer`
- `typescript_api_reviewer`
- `performance_reliability_reviewer`
- `security_reviewer`

Mechanical checks and repository scans are orchestrator-dispatched functions,
not additional roles. Subagents must not spawn subagents.

## Ownership And Concurrency

- Use one production-code writer for overlapping files.
- Parallelize independent read-only research, verification, and review.
- Use task branches and isolated worktrees for standard and high-risk work.
- Collect a complete review wave before sending one deduplicated correction
  batch to the implementation owner.
- Close every subagent immediately after its assigned role completes.

## Branches And Remote State

- `master` is the release branch. Never merge or push it unless the human
  explicitly requests a PR into `master`.
- `dev` is the integration branch.
- Create task branches from current `dev`, named `task/<id>-<slug>`.
- Merge completed tasks into `dev` only after review and verification.
- Push the task branch and updated `dev`, then verify remote refs.
- A push to `master` intentionally triggers snapshot publication.

## Validation Contract Sources

Runtime behavior is defined primarily by documentation in immutable upstream
Proto sources:

- `spine/options.proto` from `SpineEventEngine/base-libraries`;
- later extensions from `spine/time_options.proto` in `SpineEventEngine/time`.

Resolve each intake to an exact upstream commit, record provenance and a
checksum, and never edit the vendored file. Frozen upstream style violations
must not fail project-owned Buf lint rules. Compilation, descriptor use, and
provenance checks still apply.

Do not treat the JVM Validation implementation as the default design source.
Consult it only when the human or an approved task specifically requires
behavioral comparison.

## Autonomous Cycle

1. Classify the approved milestone as micro, standard, or high-risk.
2. Record acceptance criteria, human-imposed requirements, skill selection,
   branch/worktree ownership, and risk assumptions.
3. Use deep planning only for public or serialized contracts, validation
   semantics, new subsystems, security, persistence, concurrency, or a proven
   architectural blocker.
4. Implement with behavior-focused tests when runtime behavior changes.
5. Run focused mechanical checks before specialist review.
6. Invoke only relevant review roles; give every canonical concern a clean,
   accepted, or concrete N/A disposition.
7. Aggregate findings once, correct accepted findings, and re-review only
   substantively affected concerns.
8. Run the full verification gate at the cadence in `BUILD_PROTOCOL.md`.
9. Commit, push, merge to `dev`, post-merge verify, push `dev`, confirm remote
   refs, close agents, and remove clean merged worktrees.

## Completion Gates

Do not claim completion without fresh evidence. The canonical full gate is:

```bash
pnpm verify
```

## Version Changes

Every root framework-version change is an isolated version-only commit. Update
the root, `packages/validation`, and `packages/example` manifest versions
together; do not include documentation, source, dependency, lockfile, or
generated-output changes. The commit subject must be exactly
`Bump version -> <version>`.

Runtime or test changes must preserve the enforced baseline of at least 80%
statements, 80% lines, 70% branches, and 90% functions. Reach 90% across all
coverage dimensions before substantial behavioral expansion.

Stop only for the blockers defined in `BUILD_PROTOCOL.md`.
