# Contributing to Spine Validation for TypeScript

Thank you for improving `@spine-event-engine/validation`. For setup, commands,
and detailed change recipes, start with the [development guide](development.md).
The [package guide](../README.md) is the consumer-facing API reference.

## Prepare Your Change

1. Create a branch from `dev` and check `git status` before editing. Keep
   unrelated changes out of your pull request.
2. Use Node.js 24.18.0 from [`.node-version`](../../../.node-version), then run
   `corepack enable pnpm` before the first bare `pnpm` command.
3. Install with `corepack pnpm install --frozen-lockfile`. A cold Corepack cache
   may need network access for pnpm; a cold pnpm store may then download the
   locked packages.
4. Do not edit generated TypeScript or immutable vendored Spine Proto files.

For runtime behavior, write or change a focused failing test first, make the
smallest passing change, and keep valid example schemas separate from invalid
test fixtures.

## Test and Document

Run focused checks while working. From a clean checkout, build before the root
example test:

```bash
pnpm build
pnpm test:example
```

`pnpm build` creates the validation package’s `dist` output needed by root
`pnpm test:example`. Before opening a pull request, run the checks appropriate
to the change; `pnpm verify` is the complete local gate.

Update public API declarations, package documentation, and executable examples
with any consumer-visible behavior. `pnpm docs:check` validates maintained
Markdown links and TypeScript examples, checks public imports and documentation
rules, and generates TypeDoc.

## Commit and Open a Pull Request

Write focused conventional commits. Target pull requests at `dev`, describe the
behavior change and checks run, and request review after the branch is ready.
Do not merge or push `master` without explicit human approval.

## Version Changes

For a root framework-version change, update the `version` field—and only that
field—in all three synchronized manifests: root `package.json`,
`packages/validation/package.json`, and `packages/example/package.json`. Make
that change in an isolated version-only commit with this exact subject:

```text
Bump version -> <version>
```

Do not combine the version change with source, documentation, dependency,
lockfile, or generated-output work. The lockfile does not encode workspace
manifest versions. The full policy is in
[`BUILD_PROTOCOL.md`](../../../build-protocol/BUILD_PROTOCOL.md#framework-version-changes).

## Need Help?

Open an issue with the expected behavior, a minimal Proto or TypeScript
reproduction, the command and output, and the Node and pnpm versions. Do not
include credentials, tokens, or sensitive message payloads.
