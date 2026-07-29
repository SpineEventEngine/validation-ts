# Development guide

The [package guide](../README.md) is for consumers. This reference covers
repository development.

Use Node.js 24 or later and the committed pnpm version. From the workspace
root, install the lockfile and run the focused checks you need:

```sh
corepack pnpm install --frozen-lockfile
pnpm generate
pnpm test:validation
pnpm test:example
pnpm docs:check
pnpm source:check
pnpm typecheck:generated
pnpm lint
pnpm format:check
```

`pnpm verify` runs the complete local and CI gate, including generation,
typechecking, linting, formatting, coverage, docs, Proto verification and lint,
build output, the executable example, package contents, and diff checks.

## Source inputs

Do not edit generated TypeScript. Run `pnpm generate` after changing
project-owned Proto inputs. Official upstream Proto sources are copied
unchanged; `pnpm proto:verify` checks their recorded checksum.

Runtime behavior changes use a focused failing test before implementation, then
the smallest passing change. Validation tests use generated schemas rather than
mocks. Keep invalid declarations in test fixtures and keep runnable example
schemas valid.

## Documentation and API checks

`pnpm docs:check` checks maintained links, TypeScript fences, public imports,
diagnostic placeholders, preview-install presentation, and TypeDoc. It also
requires package-local reference pages to link back to the package guide.
`pnpm source:check` verifies project-owned TypeScript and Proto conventions.

For repository governance, branch policy, review, and integration details, use
the internal [contributor workflow](../../../build-protocol/CONTRIBUTOR_WORKFLOW.md).
