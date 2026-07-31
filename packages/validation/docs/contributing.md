# Contributing to Spine Validation for TypeScript

Thank you for improving `@spine-event-engine/validation`. This guide explains
how to prepare a reviewable repository change. For setup, scripts, and extension
workflows, start with the [development guide](development.md). The
[package guide](../README.md) remains the consumer-facing API reference.

## Before You Change Code

1. Read [`AGENTS.md`](../../../AGENTS.md), the active work record, and the
   applicable protocol documents under [`build-protocol/`](../../../build-protocol/).
2. Confirm the branch, worktree, ownership, and existing Git changes. Preserve
   unrelated work.
3. Keep immutable vendored Spine Proto files unchanged. An upstream intake is a
   separately approved workflow; see the development guide.
4. For a runtime change, add or adjust a focused failing behavior test before
   the implementation, then make the smallest passing change.

## Keep A Change Reviewable

- Keep consumer documentation, examples, and public API declarations aligned
  with any public behavior change.
- Regenerate generated TypeScript with `pnpm generate`; do not edit generated
  output by hand.
- Use runnable example schemas only for valid configurations. Keep deliberately
  invalid declarations in test-only fixtures.
- Record work and delivery-log evidence at meaningful resumability boundaries.
- Do not modify earlier review, decision, or delivery evidence.

## Run The Right Checks

Run focused checks while working, then use the complete gate when the active
work item requires it:

```bash
pnpm source:check
pnpm format:check
pnpm docs:check
pnpm test:validation
pnpm test:example
pnpm verify
```

`pnpm docs:check` validates maintained Markdown links and TypeScript examples,
checks public imports and documentation rules, and generates TypeDoc. The full
`pnpm verify` gate also checks Node, Proto source integrity, deterministic generation,
types, linting, coverage, Proto linting, builds, the executable example,
package contents, and the Git diff.

## Version Changes

A root framework-version change is its own commit. Change the root,
`packages/validation`, and `packages/example` manifest versions together, and
make no other file change in that commit. Its subject must be exactly:

```text
Bump version -> <version>
```

Do not combine a version change with documentation, source, dependency, or
generated-output work. The lockfile does not encode workspace manifest versions.

## Submit For Review

Before handing off, inspect `git status`, `git diff --check`, the diff, and the
active work record. Include the commands run and their results, any limitations,
and the next action in the current work log. The orchestrator collects the
required review wave, handles integration into `dev`, and performs remote
synchronization. Do not merge or push `master` without explicit human approval.

## Need Help?

Open a focused issue or work record with the behavior you expected, the minimal
Proto or TypeScript reproduction, the command and output, and the environment
(Node and pnpm versions). Do not include credentials, tokens, or sensitive
message payloads.
