# T-0008: Move pnpm Workflow Setup to Node 24

Status: Ready for integration
Classification: High-risk
Baseline: `48a3ccab3d4a09de86af115b03469a078be6b4aa`
Branch: `task/T-0008-node24-actions`
Worktree: `.worktrees/T-0008-node24-actions`
Approved plan: Human instruction to address the remaining
`pnpm/action-setup@v4` Node 20 deprecation warning on 2026-07-29

## Acceptance Criteria

- Every project-owned GitHub workflow uses the current Node 24-compatible
  `pnpm/action-setup@v6` major line.
- A repository-owned regression test fails if a workflow reintroduces another
  `pnpm/action-setup` major and runs in the canonical verification gate.
- Verification and automatic publication keep pnpm `11.9.0`, the existing
  Node setup, cache behavior, commands, permissions, and branch triggers.
- The task branch and merged `dev` pass the canonical gate and are pushed.
- The final `dev` GitHub Actions run succeeds without the Node 20 action-runtime
  warning. `master` remains untouched and no publication is triggered.

## Human-Imposed Requirements Ledger

| Requirement                                           | Source         | Verification                                           |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------ |
| Address the remaining `pnpm/action-setup@v4` warning. | Human task     | Warning-free remote Actions annotations                |
| Keep automatic publication on pushes to `master`.     | Prior decision | Publish workflow trigger and commands remain unchanged |
| Work through task branches and integrate into `dev`.  | Branch policy  | Task/dev remote-ref evidence                           |
| Do not merge or push `master`.                        | Branch policy  | Remote master comparison                               |

## Upstream Evidence

- Official `pnpm/action-setup` release `v6.0.8`, published 2026-05-12, is the
  current stable release and is signed/verified.
- Official `v6` `action.yml` declares `runs.using: node24`.
- Existing project workflows pin GitHub Actions by supported major tags
  (`actions/checkout@v6`, `actions/setup-node@v6`). T-0008 preserves that
  established update convention rather than introducing a partial SHA-pinning
  policy.

## Skills

| Skill                            | Selected? | Reason                                                                                |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `systematic-debugging`           | Yes       | Trace the warning to the action runtime metadata and prove the supported replacement. |
| `using-git-worktrees`            | Yes       | Isolate verification and publishing workflow changes.                                 |
| `test-driven-development`        | Yes       | Establish a failing repository workflow-policy regression before editing workflows.   |
| `implement`                      | Yes       | Give one owner the guard, workflow edits, and durable logs.                           |
| `subagent-driven-development`    | Yes       | Use project implementation and specialist review roles.                               |
| `requesting-code-review`         | Yes       | Review the full workflow/test diff before integration.                                |
| `verification-before-completion` | Yes       | Require local gates and warning-free remote Actions evidence.                         |
| `openai-docs`                    | No        | No OpenAI/Codex configuration or guidance changes.                                    |

## Agent Dispatch

| Role/function                | Agent ID                   | Expected model  | Expected reasoning | Scope                                                        | Status    |
| ---------------------------- | -------------------------- | --------------- | ------------------ | ------------------------------------------------------------ | --------- |
| Requirements split           | `/root/t0008_requirements` | `gpt-5.6-sol`   | high               | Audit runtime, test, publishing, and verification boundaries | Completed |
| Implementation               | `/root/t0008_implementer`  | `gpt-5.6-terra` | medium             | Own workflow guard, workflows, package script, and logs      | Completed |
| Style/maintainability review | `/root/t0008_style`        | `gpt-5.6-terra` | high               | Guard quality, minimality, task-record accuracy              | Completed |
| Reliability review           | `/root/t0008_reliability`  | `gpt-5.6-terra` | high               | CI parity, supported action runtime, deterministic gates     | Completed |
| Security review              | `/root/t0008_security`     | `gpt-5.6-terra` | high               | Publishing workflow integrity and action supply-chain risk   | Completed |

## Scope And Ownership

- The implementation owner owns `.github/workflows/build.yml`,
  `.github/workflows/publish.yml`, the workflow regression under `scripts/`,
  the root verification script entry, direct test-only `yaml` dependency and
  root lock importer, this task record, and the T-0008 work log.
- The orchestrator owns upstream verification, review aggregation, final gates,
  Git integration, remote synchronization, warning inspection, and cleanup.
- Excluded: action SHA-pinning policy migration, workflow restructuring,
  pnpm/Node upgrades, publishing behavior changes, dependencies other than the
  approved direct test-only `yaml@2.9.0`,
  publication, runtime code, and `master`.

## Decisions And Questions

- Root cause: `pnpm/action-setup@v4` declares a Node 20 JavaScript action
  runtime. GitHub now forces that action onto Node 24 and emits a deprecation
  annotation for each invocation.
- Hypothesis: Replacing all three project-owned uses with the supported `v6`
  major removes the annotation because upstream `v6/action.yml` declares
  `node24`, without changing pnpm or workflow behavior.
- The regression will inspect all project-owned workflow files and require
  every `pnpm/action-setup` reference to use `@v6`; it must not depend on remote
  Actions execution.
- The regression discovers both `.yml` and `.yaml`, accepts quoted or unquoted
  `uses:` values, and fails if it finds no workflow files or no pnpm setup
  references. Focused fixtures cover accepted `@v6`, rejected other versions,
  both extensions, and non-vacuity.
- Re-review proved the hand-written lexical scanner was incomplete: it missed
  quoted keys, multiline/nested flow maps, and could false-trigger on scalar
  content. This concrete evidence supersedes the earlier no-dependency plan.
  The guard now uses the maintained `yaml@2.9.0` package as a direct root
  test-only dependency and parses each workflow semantically; the pre-existing
  lock resolution is reused.
- Semantic scope is restricted to GitHub Actions action locations only:
  `jobs.<job_id>.uses` for reusable-workflow jobs and
  `jobs.<job_id>.steps[*].uses` for step actions. Other keys named `uses`, such
  as `env.uses`, are not action references and must not affect this policy.
- Dependency evidence: Node has no built-in YAML parser, and the custom scanner
  was rejected as provably incomplete. `yaml@2.9.0` is the direct test-only
  contract: official source is https://github.com/eemeli/yaml/tree/v2.9.0;
  registry metadata checked 2026-07-29 identifies 2.9.0 as current, modified
  2026-05-11, with Node >=14.6 support. It exports bundled declarations at
  `./dist/index.d.ts` and is compatible with this Node 24 ESM workspace.
  The transitive `js-yaml@4.3.0` is not root-declared, lacks a bundled-types
  export in its installed manifest, and promoting it would create a direct
  contract without reducing the graph; it is therefore weaker TypeScript
  tooling. `yaml@2.9.0` already enters the lock graph through Vite.
- No material human questions remain.

## Verification

| Command                                                     | Result                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Baseline `pnpm install --frozen-lockfile` and `pnpm verify` | Passed: 17 files / 319 tests, all canonical gates, and packed consumer.                 |
| RED `pnpm test:workflow-pnpm-action-setup`                  | Expected failure: repository assertion found `@v4`; scan found all three obsolete uses. |
| GREEN `pnpm test:workflow-pnpm-action-setup`                | Passed: 5/5 fixture and live-repository assertions.                                     |
| `pnpm format:check`                                         | Passed after formatting the assigned task record and new regression.                    |
| Verify-script presence check                                | Passed: root `verify` invokes `pnpm test:workflow-pnpm-action-setup`.                   |
| `git diff --check`                                          | Passed; workflow diff contains exactly the three approved major-tag substitutions.      |
| Independent `pnpm verify`                                   | Passed: six workflow-policy tests, 17 files / 319 tests, and every canonical gate.      |
| Review-correction focused guard                             | Passed: 9/9 cases, including block-scalar, flow-mapping, and comment boundaries.        |
| Frozen install and semantic-parser focused guard            | Passed: `pnpm install --frozen-lockfile`; 14/14 guard cases.                            |
| Action-location scope focused guard                         | Passed: 16/16 cases; `env.uses` ignored while job/step action refs are enforced.        |
| Final independent `pnpm verify`                             | Passed: 16 workflow-policy tests, 17 files / 319 tests, and every canonical gate.       |

Coverage: 94.71% statements, 91.51% branches, 99.19% functions, and 95.96%
lines.

## Review Dispositions

| Concern                 | Reviewer                  | Disposition | Evidence                                                                     |
| ----------------------- | ------------------------- | ----------- | ---------------------------------------------------------------------------- |
| Style/maintainability   | `/root/t0008_style`       | Clean       | Final action-location and dependency-evidence corrections re-reviewed clean. |
| Documentation           | N/A                       | N/A         | No maintained user/package documentation contract changes.                   |
| TypeScript/API          | N/A                       | N/A         | No package source, declarations, exports, or API changes.                    |
| Performance/reliability | `/root/t0008_reliability` | Clean       | Semantic parser correction re-reviewed clean.                                |
| Security                | `/root/t0008_security`    | Clean       | Semantic parser, lock integrity, and policy bypasses re-reviewed clean.      |

## Findings

| ID    | Severity               | Accepted? | Resolution                                                                                                                                                                                                                                                      |
| ----- | ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T8-R1 | P2 style               | Yes       | The line regex matched `uses:` text inside YAML literal/folded scalar bodies. Semantic YAML parsing now treats those bodies as scalar values; corrected and re-reviewed clean.                                                                                  |
| T8-R2 | P2 security            | Yes       | The line regex omitted `uses:` fields in YAML flow mappings, including after another key. Semantic parser support at step locations finds them; corrected and re-reviewed clean.                                                                                |
| T8-R3 | P2 correctness         | Yes       | Re-review rejected the partial lexical extractor: quoted keys, multiline/nested flow maps, and quoted scalar boundaries remained incomplete. Replaced with semantic `yaml@2.9.0` parsing; corrected and re-reviewed clean.                                      |
| T8-R4 | P2 correctness         | Yes       | Recursive semantic traversal falsely treated unrelated values such as `env.uses` as actions. Restricted inspection to `jobs.*.uses` and `jobs.*.steps[*].uses`; corrected and re-reviewed clean.                                                                |
| T8-R5 | P2 dependency evidence | Yes       | Node has no YAML parser; custom scanning was rejected, and transitive `js-yaml` is a weaker undeclared/untyped direct contract. Direct test-only `yaml@2.9.0` provides maintained Node 24 ESM support and bundled declarations; accepted and re-reviewed clean. |

## Implementation Self-Review

- Changed only the owned workflow scalars, root script wiring, workflow-policy
  regression, direct test-only `yaml@2.9.0` metadata/root importer, and T-0008
  durable records; no runtime package source, lock graph node, immutable Proto,
  public documentation, or unrelated project-plan file was edited.
- Workflow diff retains all existing triggers, permissions, environments, job and
  step order, Node setup/cache settings, pnpm version, install flags, and commands;
  only the three `pnpm/action-setup` refs changed from `@v4` to `@v6`.
- The fixture-backed Node test discovers both workflow extensions, quoted and
  unquoted `uses:` values, rejects every non-`v6` pnpm setup reference, and fails
  closed when workflows or pnpm setup references are absent.
- The semantic parser is direct test-only tooling; it reports malformed YAML
  with its workflow path, examines only reusable-job and step action `uses`
  fields, and reuses the already locked `yaml@2.9.0` graph node.

## Integration

- Task commit:
- Task push:
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Remote Actions:
- Worktree cleanup:

## Open Risks And Follow-Up

| Risk                                                                     | Owner        | Route                                                                                   | Disposition | Review point     |
| ------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------- | ----------- | ---------------- |
| A major action update can change setup behavior despite the same inputs. | Orchestrator | Focused structural test, full gate, compatibility job, and security/reliability review. | Mitigated   | Remote Actions   |
| The publish workflow does not run on `dev`.                              | Orchestrator | Structural parity guard plus review; do not trigger publication for this task.          | Mitigated   | Completed review |
