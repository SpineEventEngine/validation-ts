# Development Guide

This guide is for maintainers and automated contributors working in this
repository. For installing and using the published library, use the
[package guide](../README.md). For the review handoff, use the
[contribution guide](contributing.md).

## System Requirements

Development and CI use Node.js 24.18.0, recorded in
[`.node-version`](../../../.node-version). The workspace declares Node 24 or
later and pins pnpm 11.9.0 through the root `packageManager` field. Enable pnpm
through Corepack; do not substitute npm or create a `package-lock.json`.

The checked-in lockfile, [pnpm-lock.yaml](../../../pnpm-lock.yaml), is the
install authority. Network access is needed only when the local pnpm store does
not already contain the locked packages. Buf and `protoc-gen-es` are workspace
development dependencies, so no global installation is needed.

### Supported and verified environments

| Surface          | Supported                    | Verified in this repository |
| ---------------- | ---------------------------- | --------------------------- |
| Node.js          | 24 or later                  | 24.18.0                     |
| Package manager  | pnpm 11.9.0 through Corepack | 11.9.0                      |
| Module format    | ESM                          | ESM                         |
| Test runner      | Vitest                       | Vitest 4.1.9                |
| Protobuf runtime | Protobuf-ES v2               | `@bufbuild/protobuf` 2.13.0 |

The published package supports Node 24 or later. The exact development tool
versions above are the locked, verified workspace baseline; update them only
through an approved dependency change.

## Clean Installation and Build Order

From a fresh checkout at the repository root:

```bash
corepack pnpm install --frozen-lockfile
pnpm build
pnpm test:validation
pnpm test:example
```

`pnpm build` first generates all schemas and then builds the TypeScript project
references. `pnpm test:example` needs the validation package’s `dist` output;
run `pnpm build` first in a clean worktree, or use the package-level example
test command, which builds that dependency itself:

```bash
pnpm --filter @spine-event-engine/example-smoke test
```

Use `pnpm example` to build and run the console example, or `pnpm example:run`
after a workspace build when you only want to execute its compiled output.

## Repository Layout

```text
validation-ts/
├── packages/
│   ├── validation/       published package: source, tests, Proto inputs, and docs
│   └── example/          executable consumer and its Vitest scenarios
├── scripts/              repository verification and documentation checks
├── build-protocol/       current work, review, quality, and delivery policy
├── pnpm-lock.yaml        locked workspace dependency graph
└── package.json          workspace scripts and pinned package-manager version
```

Generated TypeScript is intentionally ignored under package `src/generated/`
and test generated directories. Distribution output is also generated. Do not
hand-edit either; use the relevant script.

## Commands

Run commands from the repository root unless a workflow says otherwise.

| Command                    | Use it for                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| `pnpm generate`            | Generate package, test, and example Protobuf-ES schemas.            |
| `pnpm build`               | Generate schemas and compile all TypeScript project references.     |
| `pnpm typecheck:generated` | Build and typecheck generated-aware package and example tests.      |
| `pnpm test:validation`     | Generate schemas and run validation-package Vitest tests.           |
| `pnpm test:example`        | Generate schemas and run executable-example Vitest tests.           |
| `pnpm docs:check`          | Check maintained docs and examples and generate TypeDoc.            |
| `pnpm source:check`        | Check project-owned TypeScript and Proto conventions.               |
| `pnpm proto:verify`        | Verify immutable upstream Proto checksums and source metadata.      |
| `pnpm proto:lint`          | Lint project-owned Proto while honoring immutable-input exceptions. |
| `pnpm format:check`        | Check Prettier formatting without modifying files.                  |
| `pnpm lint`                | Run ESLint.                                                         |
| `pnpm verify`              | Run the complete local and CI gate.                                 |

`pnpm verify` includes Node compatibility, Proto source integrity, generation,
typechecking, source and formatting checks, linting, deterministic generation,
coverage, documentation, Proto linting, build output, the executable example,
package contents, and Git-diff checks.

## Copy-ready Workflows

### Add a validation option

Use this workflow for a supported new option or for an extension of the option
registry. Public or serialized validation semantics need the planning and review
level specified by `build-protocol/BUILD_PROTOCOL.md`.

```bash
pnpm generate
pnpm exec vitest run packages/validation/tests/when.test.ts
```

Vitest does not use Jest’s `--runInBand` flag. Select the relevant test file
with its path, as in the command above.

Start by adding a behavior-focused test and the smallest project-owned Proto
fixture needed to make it fail. Add the option implementation and registry
wiring, regenerate schemas, and run the same focused test. Update the package
README, [validation contract](validation-contract.md), example where it helps
consumers, and public TSDoc if the public API changes.

### Modify runtime behavior

```bash
pnpm exec vitest run packages/validation/tests/<relevant-test>.test.ts
pnpm test:validation
```

Keep the first command narrowly focused while demonstrating the changed
behavior. Then run the package suite. Use generated schemas and real descriptors
instead of mocks; add an integration test when traversal, nesting, message
paths, or option composition is involved. Do not change runtime behavior solely
to make an example convenient.

### Change Proto fixtures or immutable upstream inputs

For a project-owned fixture, edit the appropriate file under
`packages/validation/tests/proto/` or `packages/example/proto/`, then run:

```bash
pnpm generate
pnpm proto:lint
pnpm test:validation
```

Never edit vendored Spine inputs such as `spine/options.proto`,
`spine/time_options.proto`, or `spine/time/time.proto`. A new or replacement
upstream input requires a separately approved intake: resolve an exact upstream
commit, retrieve the raw file byte-for-byte, record repository, commit, path,
URL, retrieval date, local path, and SHA-256 in the source manifest, then
run `pnpm proto:verify`, generation, and linting. The immutable-input policy is
also summarized in [the immutable Proto guide](../../../build-protocol/proto/README.md).

### Update public API, documentation, examples, or dependencies

For a public API change, update exports, declarations, package README examples,
and TypeDoc together. `pnpm docs:check` compiles TypeScript fences, rejects
non-public package imports, validates local links, and generates TypeDoc.

For an executable consumer change, update `packages/example/src/scenarios.ts`
and its Vitest tests; keep invalid configuration fixtures under
`packages/example/proto/testing/`, not in runnable schemas.

For a dependency change, follow the approved work item and record why the current
dependency or platform feature is insufficient, compatibility with Node and
TypeScript, and the verification result. Use pnpm so the lockfile stays
authoritative.

### Change the framework version

Treat every root framework-version change as a release-metadata boundary. Change
the root, `packages/validation`, and `packages/example` manifest versions in one
isolated version-only commit. The subject must be exactly:

```text
Bump version -> <version>
```

Do not include documentation, source, lockfile, generated-output, or dependency
changes in that commit. The lockfile does not encode workspace manifest versions.

## Troubleshooting

| Symptom                                            | Likely cause and resolution                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| pnpm rejects the Node version                      | Switch to the version in `.node-version`, then rerun the command.                                              |
| Example root test cannot resolve validation `dist` | Run `pnpm build` first, or run `pnpm --filter @spine-event-engine/example-smoke test`.                         |
| Generated imports or fixtures are missing          | Run `pnpm generate`; never add generated files manually.                                                       |
| `pnpm proto:verify` reports a checksum mismatch    | Restore the immutable file; if upstream intake is intended, stop and use the approved intake workflow.         |
| A docs TypeScript snippet fails                    | Import only public package exports and use ESM `.js` relative imports.                                         |
| A time check differs by zone or range              | Read the `(when)` conversion details in the validation contract and include the exact input in a focused test. |

## Review and Verification

Before review, inspect the owned diff, `git diff --check`, documentation links,
and work-record evidence. Run the focused checks that cover the change. The
orchestrator dispatches the required review concerns, aggregates findings, and
performs integration; do not bypass those boundaries.

Run the full gate when the active work item or protocol requires it:

```bash
pnpm verify
```

Record the exact command result, coverage where applicable, limitations, and
next action in the current work and delivery logs. Never merge or push `master`
without explicit human approval.
