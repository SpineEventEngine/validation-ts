# Contributor Workflow

## Start

1. Read `AGENTS.md`, the approved plan, active task record,
   `BUILD_PROTOCOL.md`, `CODE_QUALITY.md`, and relevant technical documents.
2. Confirm classification, baseline, branch, worktree, ownership, and dirty
   state.
3. Reuse the task-level skill applicability check and read selected skills.
4. Record unresolved questions before changing behavior.

## Implement

- Stay within assigned ownership.
- Preserve unrelated user changes.
- Use behavior-focused tests for runtime changes.
- Never edit immutable vendored Proto files.
- Run focused typechecks/tests frequently.
- Update task and work logs at meaningful resumability boundaries.

## Review

- Run the pre-review diff/docs/status scan.
- Give each reviewer one bounded concern and immutable diff basis.
- Record model/reasoning dispatch metadata.
- Wait for the complete wave.
- Classify and deduplicate findings before correction.
- Reopen only substantively affected lanes.

## Close

1. Run the required verification gate and inspect its complete output.
2. Record review convergence, evidence, limitations, and next action.
3. Commit and push the task branch.
4. Merge into `dev`, prove whether the merged tree equals the verified tree,
   and run the appropriate post-merge checks.
5. Push `dev`, inspect remote refs, close all agents, and remove the clean
   merged worktree.

Never merge or push `master` without an explicit human request for that release
boundary.

## Framework Version Changes

Follow [Framework Version Changes](BUILD_PROTOCOL.md#framework-version-changes)
in the build protocol.
