# T-0001: Protocol And Verification Bootstrap

Status: In review
Classification: High-risk
Baseline: `c7527325ce2130e3766bacc6effabc1af238f2b6`
Branch: `task/t-0001-protocol-bootstrap`
Worktree: `.worktrees/t-0001-protocol-bootstrap`
Approved plan: Human-approved on 2026-07-24.

High-risk reasons: public npm package rename, dependency lock and verification
tooling, CI/publishing-adjacent configuration, and immutable Proto contract
governance.

## Acceptance Criteria

- `master` matches fresh origin state and remains untouched by T-0001.
- `dev` is the pushed integration branch.
- Permanent `AGENTS.md`, executable Sol/Terra roles, governing protocol,
  templates, task records, and decision records are installed.
- Obsolete local agentic files are removed without touching unrelated user
  files.
- All package, workspace, directory, import, and documentation surfaces use
  `@spine-event-engine/validation` at `2.0.0-snapshot.5`.
- npm/Jest/CommonJS remain in place.
- A committed npm lockfile, Node/tool pins, PR CI, API docs, coverage ratchet,
  generated checks, packaging/consumer checks, and one root verification gate
  are operational.
- Upstream Proto inputs are pinned, checksummed, immutable, and exempt only
  from incompatible style lint.
- Focused and full checks pass, relevant review converges, the task branch and
  merged `dev` are pushed, remote refs match, and all agents/worktrees close.

## Human-Imposed Requirements Ledger

| Requirement                                                                                   | Source                | Verification                         |
| --------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------ |
| Adapt Spine TS protocol without its historical/project-specific corpus.                       | Human answer 1        | Artifact inventory and review        |
| Remove obsolete agentic files.                                                                | Human answer 1        | Local-state check                    |
| Use only dispatchable Sol/Terra profiles.                                                     | Human answer 2        | `.codex` config validation           |
| Create `dev` from fresh remote `master`; integrate there until an explicit master PR request. | Human answer 3        | Git and remote refs                  |
| Add modern gates and a committed lockfile; defer npm/Jest/CommonJS migration.                 | Human answer 4        | Package scripts, lock, CI, decisions |
| Rename every surface to `@spine-event-engine/validation`.                                     | Final clarification 1 | Repository search and package smoke  |
| Advance to `2.0.0-snapshot.5`.                                                                | Final clarification 2 | Metadata and package smoke           |
| Keep automatic publishing on `master` push.                                                   | Final clarification 3 | Workflow inspection                  |
| Enforce 80/80/70 baseline and reach 90 before substantial expansion.                          | Human answer 5        | Jest thresholds and protocol         |
| Use documented upstream Proto behavior; freeze and never style-edit copied files.             | Human answer 6        | Provenance and checksum gate         |

## Skills

| Skill                            | Selected? | Reason                                                                                              |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `using-git-worktrees`            | Yes       | Approved isolated execution                                                                         |
| `implement`                      | Yes       | Execute the approved bootstrap plan                                                                 |
| `openai-docs`                    | Yes       | Current Codex configuration and AGENTS guidance                                                     |
| `requesting-code-review`         | Yes       | Major high-risk task before integration                                                             |
| `verification-before-completion` | Yes       | Fresh evidence before commit/merge/completion                                                       |
| `test-driven-development`        | No        | No runtime behavior is intentionally changed; configuration checks are added and exercised directly |

OpenAI Codex manual refreshed on 2026-07-24. Relevant guidance confirmed that
repo instructions belong in concise `AGENTS.md`, project settings in trusted
`.codex/config.toml`, custom role files require `name`, `description`, and
`developer_instructions`, and read-heavy work/reviews are suitable for
subagents.

## Agent Dispatch

| Role/function                      | Agent ID                      | Expected model  | Expected reasoning | Scope                                  | Status   |
| ---------------------------------- | ----------------------------- | --------------- | ------------------ | -------------------------------------- | -------- |
| Upstream Proto/provenance research | `/root/proto_provenance`      | `gpt-5.6-terra` | medium             | Read-only source and Buf strategy      | Complete |
| Dependency/tool verification       | `/root/tooling_research`      | `gpt-5.6-terra` | medium             | Read-only retained-stack compatibility | Complete |
| Implementer                        | Main orchestrator             | `gpt-5.6-sol`   | medium             | Approved bootstrap                     | Complete |
| Style/maintainability review       | `/root/style_review`          | `gpt-5.6-terra` | high               | Protocol and repository quality        | Complete |
| Documentation review               | `/root/docs_review`           | `gpt-5.6-terra` | medium             | Claims and contributor guidance        | Complete |
| TypeScript/API review              | `/root/typescript_api_review` | `gpt-5.6-terra` | high               | Package and public API                 | Complete |
| Performance/reliability review     | `/root/reliability_review`    | `gpt-5.6-terra` | high               | CI, generation, package reliability    | Complete |

## Scope And Ownership

- Main orchestrator owns all T-0001 writes.
- Research and review agents are read-only.
- Runtime validation semantics are excluded.
- npm/Jest/CommonJS migration is excluded.
- `master` changes and publication are excluded.

## Decisions And Questions

Accepted decisions are D-0001 through D-0010 in `DECISION_LOG.md`.
No unresolved human questions remain.

## Verification

| Command             | Result                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| Baseline `npm test` | 11 suites, 232 tests passed                                                           |
| `npm ci`            | Passed; committed npm lockfile installed                                              |
| `npm run verify`    | Passed through all 13 root gates, including package installation and consumer loading |

Coverage: 81.88% statements, 71.01% branches, 92.18% functions, and 81.48%
lines. Generated output digest:
`8b58b42ad69650c0b1f40a4b2d39959ab851cfb845f2be33e537e64a911fe552`.

## Review Dispositions

| Concern                 | Reviewer                      | Disposition                                                   | Evidence           |
| ----------------------- | ----------------------------- | ------------------------------------------------------------- | ------------------ |
| Style/maintainability   | `/root/style_review`          | Accepted P1/P2 correction; re-review pending                  | F-001–F-003        |
| Documentation           | `/root/docs_review`           | Accepted P2 correction; re-review pending                     | F-004–F-005        |
| TypeScript/API          | `/root/typescript_api_review` | Clean                                                         | Package/API review |
| Performance/reliability | `/root/reliability_review`    | Accepted duplicate Node P1 correction; re-review pending      | F-002              |
| Security                | N/A                           | Release-readiness review; no release or master push in T-0001 | D-0004             |

## Integration

- Task commit: Pending.
- Task push: Pending.
- `dev` merge: Pending.
- Post-merge verification: Pending.
- Remote refs: Pending.
- Worktree cleanup: Pending.

## Open Risks And Follow-Up

| Risk                                                     | Owner                | Route                  | Disposition               | Review point                            |
| -------------------------------------------------------- | -------------------- | ---------------------- | ------------------------- | --------------------------------------- |
| Existing type/runtime debt listed in `TECHNICAL_SPEC.md` | Future approved task | Human-provided roadmap | Deferred                  | Before related behavioral expansion     |
| 90% universal coverage target is not yet met             | Future coverage task | `PROJECT_PLAN.md`      | Accepted baseline ratchet | Before substantial behavioral expansion |
