# T-0003: Modernize The Example And Documentation

Status: Complete
Classification: Standard
Baseline: `d7cfbf74882801373ea171e47453777729edb572`
Branch: `task/t-0003-example-and-docs`
Worktree: `.worktrees/t-0003-example-and-docs`
Approved plan: Human approval in the Codex task on 2026-07-25

## Acceptance Criteria

- The example uses only the current Proto option contract and namespaced
  diagnostic placeholders; the runnable path contains no intentionally invalid
  validation declaration.
- Executable examples cover both User and Product schemas and demonstrate
  recently corrected presence, exact numeric-bound, distinct, nested leaf-only,
  and resolvable `Any` behavior.
- Example logic returns inspectable results behind a small interface; console
  output is an adapter over that interface.
- Jest tests execute real generated schemas and assert exact field paths, root
  types, diagnostics, duplicate classes, nested leaf-only behavior, supported
  `Any`, and the public configuration-error shape.
- Root test and canonical verification scripts execute the example tests, and
  GitHub CI exposes validation-package and example-package execution clearly.
- Root and package documentation accurately explain setup, public use, the
  supported option contract, diagnostics, traversal, limitations, and
  contributor/agent navigation. The root README remains concise.
- A project-owned documentation checker validates local links, compilable
  TypeScript examples, public imports, and prohibited stale example syntax.
- Reader testing by a fresh documentation agent finds no material ambiguity or
  unsupported behavioral claim.
- `npm run verify` passes with the existing universal 90% validation-package
  coverage threshold. The task branch and merged `dev` are pushed; `master`
  remains untouched.

## Human-Imposed Requirements Ledger

| Requirement                                                                       | Source               | Verification                                     |
| --------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| Review and modernize the example API.                                             | Human task           | Proto/source review and tests                    |
| Illustrate recently introduced and corrected behavior.                            | Human task           | Executable scenarios and exact assertions        |
| Include the example in CI; add tests as needed.                                   | Human task           | Root scripts and workflow review                 |
| Significantly update documentation throughout all packages for humans and agents. | Human task           | Documentation review and fresh-agent reader test |
| Keep the root README more-or-less the same.                                       | Human task           | Documentation diff review                        |
| Package identity is `@spine-event-engine/validation`.                             | Prior human decision | Package metadata and import checks               |
| Keep npm, Jest, and the current module-format policy.                             | Prior human decision | Dependency and configuration diff                |
| Work from `dev`; never merge or push `master`.                                    | Branch policy        | Git and remote-ref verification                  |

## Skills

| Skill                            | Selected? | Reason                                                                                              |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `codebase-design`                | Yes       | Put scenario behavior behind a small result-returning interface and keep console I/O in an adapter. |
| `javascript-testing-patterns`    | Yes       | Add Jest behavior tests using real generated schemas.                                               |
| `doc-coauthoring`                | Yes       | Produce structured documentation and finish with fresh-agent reader testing.                        |
| `using-git-worktrees`            | Yes       | Standard work is isolated on a task branch and worktree.                                            |
| `implement`                      | Yes       | Execute the approved example, CI, test, and documentation changes.                                  |
| `test-driven-development`        | Yes       | New scenario behavior and documentation gates begin with observed failing tests.                    |
| `subagent-driven-development`    | Yes       | One writer owns overlapping files and specialists review the completed task.                        |
| `requesting-code-review`         | Yes       | Required scoped and whole-task review.                                                              |
| `verification-before-completion` | Yes       | Fresh focused and canonical evidence precede completion claims.                                     |

## Agent Dispatch

| Role/function                  | Agent ID                        | Expected model  | Expected reasoning | Scope                                                                  | Status              |
| ------------------------------ | ------------------------------- | --------------- | ------------------ | ---------------------------------------------------------------------- | ------------------- |
| TypeScript implementation      | `/root/t0003_implementer`       | `gpt-5.6-terra` | medium             | Own example schemas/source/tests and CI scripts                        | Complete and closed |
| Documentation correction       | `/root/t0003_docs_implementer`  | `gpt-5.6-terra` | medium             | Own maintained docs, checker/tests, and permanent baseline corrections | Complete and closed |
| Final correction batch         | `/root/t0003_final_corrections` | `gpt-5.6-terra` | medium             | Resolve accepted whole-task findings F-001 through F-016               | Complete and closed |
| Style/maintainability review   | `/root/t0003_style`             | `gpt-5.6-terra` | high               | Whole-task maintainability and test quality                            | Clean and closed    |
| Documentation/reader review    | `/root/t0003_docs`              | `gpt-5.6-terra` | medium             | Accuracy, navigation, agent usability, and reader questions            | Clean and closed    |
| TypeScript/API review          | `/root/t0003_api`               | `gpt-5.6-terra` | high               | Public imports, generated-schema use, package/API claims               | Clean and closed    |
| Performance/reliability review | `/root/t0003_reliability`       | `gpt-5.6-terra` | high               | CI determinism, scripts, docs gate, and example execution              | Clean and closed    |

## Scope And Ownership

- One implementation owner owns all overlapping example, CI, tests, package
  documentation, TypeDoc comments, and documentation-checker files.
- The orchestrator owns task records, review aggregation, verification, Git
  integration, and remote synchronization.
- Review agents are read-only and are closed immediately after reporting.
- Excluded: validation runtime semantic changes, Java-regex compatibility,
  `spine/time_options.proto`, npm/Jest/module-format migration, publication,
  and all `master` changes.

## Implementation Plan

1. Add failing example behavior tests and documentation-gate fixtures, then
   implement the testable scenario module and console adapter.
2. Modernize project-owned example Proto declarations and generated use for
   current options, placeholders, nested validation, distinct values, and
   resolvable `Any`; keep intentionally invalid configuration in a dedicated
   test-only fixture.
3. Wire example tests into root scripts, canonical verification, and explicit
   CI steps without changing the approved toolchain.
4. Add a curated documentation index, user guide, validation-contract
   reference, architecture/contributor guide, and a detailed example guide;
   minimally update the root README and align package/TypeDoc/protocol docs.
5. Add deterministic documentation checks for local links, TypeScript snippets,
   public imports, and stale syntax.
6. Run focused checks, specialist review, one deduplicated correction wave,
   fresh-agent reader testing, and the canonical full gate before integration.

## Decisions And Questions

- Runnable examples contain valid schemas only. Invalid option-target behavior
  is isolated in a dedicated test fixture and documentation.
- Example tests cross the same result-returning interface used by the console
  adapter and use real Buf-generated messages rather than mocks.
- Documentation distinguishes current supported behavior from the unresolved
  Java `Pattern` compatibility question.
- No additional human decision is required by the approved plan.

## Verification

| Evidence                   | Result                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Example behavior           | 1 Jest suite / 7 exact generated-schema tests passed                                                         |
| Validation coverage        | 293 tests; 94.72% statements, 91.53% branches, 99.03% functions, 95.87% lines                                |
| Documentation gate         | Local links, semantic Markdown/TSDoc snippets, public imports, stale syntax, and negative regressions passed |
| Compiled example           | Built ESM console adapter executed successfully                                                              |
| Specialist review          | Style, documentation/fresh-reader, TypeScript/API, and reliability clean through `117d1a5`                   |
| Independent canonical gate | Fresh `npm run verify` passed on reviewed task head `117d1a5`                                                |

## Integration

- Reviewed task closure: `0bf86c68c169923e9885d46e3322f650d03177ed`.
- First `dev` merge: `38ce635427cb4e24ccc6f7361957a518b541ab4c`.
- Post-merge `npm run verify`: Passed all canonical gates, 293 validation
  tests, 7 example tests, compiled console execution, and 94.72% / 91.53% /
  99.03% / 95.87% coverage.
- Verified remote refs after the first integration push:
  `origin/dev@38ce635427cb4e24ccc6f7361957a518b541ab4c`,
  `origin/task/t-0003-example-and-docs@0bf86c68c169923e9885d46e3322f650d03177ed`,
  and unchanged
  `origin/master@24b6ffb8de85fcc8958d1652dd928a0142c3cdd2`.
- The final closure commit is merged to `dev` after this record is committed
  and pushed.
