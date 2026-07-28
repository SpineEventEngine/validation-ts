# Contributing and agent workflow

This repository has a governed delivery workflow. Read `AGENTS.md` first, then
the current [project plan](../build-protocol/PROJECT_PLAN.md), active task
record, technical specification, and relevant work/review logs.

Use Node.js 24 or later. The committed `.node-version` pins the tested version,
24.18.0. Install dependencies with pnpm 11.9.0 via Corepack.

## Intake, approval, and ownership

Before implementation, reconcile Git state, inspect code and contract inputs,
record scope/risks/skills/ownership, propose a concrete plan, and wait for
human approval. After approval, execute routine choices autonomously and
record meaningful resumability boundaries in the task and work logs. Preserve
unrelated changes and ignored local files.

Use one writer for overlapping production files. Standard and high-risk work
uses a task branch from current `dev` and an isolated worktree named
`task/<id>-<slug>`. `master` is release-only: never merge or push it without
explicit human approval. Completed reviewed work merges into `dev`; task and
integration branches are pushed and remote refs verified by the orchestrator.

## Test-first implementation

For runtime, example, or checker behavior, write one focused failing test,
run it and record the expected RED result, implement the smallest change, then
run it again for GREEN. Generated schemas, rather than mocks, are the normal
evidence for validation behavior. Keep invalid option declarations in
test-only fixtures; runnable examples must remain valid.

Update documentation with every public behavior, configuration, package API,
or contributor-workflow change. Markdown TypeScript fences must transpile,
named package imports must be public entry-point exports, local links must
exist, and stale unnamespaced diagnostic placeholders are rejected.

## Commands

```sh
corepack pnpm install --frozen-lockfile
pnpm generate
pnpm test:validation
pnpm test:example
pnpm docs:check
pnpm typecheck:generated
pnpm lint
pnpm format:check
pnpm verify
```

Use the narrowest relevant command during implementation. `pnpm verify` is
the final evidence gate; do not claim completion from an earlier or partial
run. It includes generation/provenance, strict typechecking, lint and format,
coverage, docs, Proto checks, build/package checks, and diff hygiene.

## Reviews and integration

Before review, inspect the diff for frozen Proto edits, stale logs, accidental
public exports, package identity drift, and unsupported documentation claims.
Collect the relevant review wave, record each finding and disposition, send
one aggregated correction batch to the existing writer, then rerun affected
checks. The canonical concerns are style/maintainability, documentation,
TypeScript/public API, and reliability; security is required for release
readiness or explicit security work.

After reviews converge, run the full gate, commit the task correction, and let
the orchestrator perform the approved integration/remote steps. Do not rewrite
historical task logs or vendored sources to make a current check pass.

## Generated and frozen inputs

`spine/options.proto` has recorded upstream provenance and is immutable.
Generated Protobuf-ES files are regenerated artifacts. Project-owned Proto
files are linted; frozen upstream style must not be made to satisfy a local
style rule. Source and behavior claims follow the precedence in
[architecture.md](architecture.md#source-of-truth-precedence).

Use Buf's `import_extension=js` option for ESM-generated relative imports. Do
not edit generated output or add a generation patcher; if a generated symbol
conflicts with project naming, alias it at the project import site.

For navigation, see [the docs index](README.md), the
[validation contract](validation-contract.md), and [the package guide](../packages/validation/README.md).
