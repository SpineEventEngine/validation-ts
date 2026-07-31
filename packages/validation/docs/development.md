# Development Guide

This guide is for people maintaining this repository. To install and use the
published library, see the [package guide](../README.md). To prepare a pull
request, see the [contribution guide](contributing.md).

## System Requirements

The published package supports Node.js 24 or later. Repository development is
verified with Node.js 24.18.0, recorded in
[`.node-version`](../../../.node-version), and pnpm 11.9.0, pinned by the root
`packageManager` field. The workspace is ESM, uses Vitest, and generates
Protobuf-ES v2 schemas.

GitHub Actions verifies the repository on Ubuntu. Its POSIX-oriented scripts are
suitable for Linux and macOS, and for Windows through WSL. Native Windows is not
CI-verified. This is development-environment guidance, not a restriction on the
published package’s Node.js runtime support.

### Supported and verified environments

| Surface                   | Supported                            | Verified here               |
| ------------------------- | ------------------------------------ | --------------------------- |
| Published package runtime | Node.js 24 or later                  | Node.js 24.18.0             |
| Repository development    | Linux, macOS, or Windows through WSL | Ubuntu                      |
| Package manager           | pnpm 11.9.0 through Corepack         | pnpm 11.9.0                 |
| Module format             | ESM                                  | ESM                         |
| Test runner               | Vitest                               | Vitest 4.1.9                |
| Protobuf runtime          | Protobuf-ES v2                       | `@bufbuild/protobuf` 2.13.0 |

Buf and `protoc-gen-es` are workspace development dependencies; no global
installation is needed. Use pnpm rather than creating a `package-lock.json`.

## Clean Installation and Build Order

From a fresh checkout at the repository root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test:validation
corepack pnpm test:example
```

Direct `corepack pnpm` invocation avoids installing a system shim beside Node.
On a cold host, Corepack may need network access to obtain pnpm 11.9.0; a cold
pnpm store then needs network access to download the packages locked in
[pnpm-lock.yaml](../../../pnpm-lock.yaml). The lockfile remains the dependency
authority.

`pnpm build` generates schemas before compiling TypeScript project references.
Root `pnpm test:example` expects the validation package’s `dist` directory, so
the ordered `pnpm build` then `pnpm test:example` sequence is safe in a clean
checkout.

Use `pnpm example` to build and run the console example. Use `pnpm example:run`
only after a workspace build when you want to run compiled output.

## Repository Layout

```text
validation-ts/
├── packages/
│   ├── validation/       published package: source, tests, Proto inputs, and docs
│   └── example/          executable consumer and its Vitest scenarios
├── scripts/              repository verification and documentation checks
├── build-protocol/       repository governance and release policy
├── pnpm-lock.yaml        locked workspace dependency graph
└── package.json          workspace scripts and pinned package-manager version
```

Generated TypeScript is ignored under package `src/generated/` and test
generated directories. Distribution output is also generated. Do not hand-edit
either; run the relevant script.

## Commands

Run these commands from the repository root after the clean installation steps.

| Command                             | Use it for                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `corepack pnpm generate`            | Generate package, test, and example Protobuf-ES schemas.                     |
| `corepack pnpm build`               | Generate schemas and compile TypeScript project references.                  |
| `corepack pnpm typecheck:generated` | Build and typecheck package and example tests.                               |
| `corepack pnpm test:validation`     | Generate schemas and run validation-package Vitest tests.                    |
| `corepack pnpm test:example`        | Run example tests after `corepack pnpm build` has created validation `dist`. |
| `corepack pnpm docs:check`          | Check maintained docs and examples and generate TypeDoc.                     |
| `corepack pnpm source:check`        | Check project-owned TypeScript and Proto conventions.                        |
| `corepack pnpm proto:verify`        | Verify local immutable Proto checksums against the recorded manifest.        |
| `corepack pnpm proto:lint`          | Lint project-owned Proto while honoring immutable-input exceptions.          |
| `corepack pnpm format:check`        | Check Prettier formatting without modifying files.                           |
| `corepack pnpm lint`                | Run ESLint.                                                                  |
| `corepack pnpm verify`              | Run the complete local and CI gate.                                          |

`corepack pnpm verify` includes Node compatibility, Proto checksum verification, generation,
typechecking, source and formatting checks, linting, deterministic generation,
coverage, documentation, Proto linting, build output, the executable example,
package contents, and Git-diff checks.

## Copy-ready Workflows

### Add a newly supported official validation option

There is no consumer registration API. A newly supported official Spine option
follows the repository-owned pattern used by `(when)`; it does not alter an
immutable upstream Proto file.

1. Confirm the option is defined by the official Proto input already vendored
   under `packages/validation/proto/spine/`. `(when)` is defined by
   `packages/validation/proto/spine/time_options.proto`. If the official input
   is absent or must change, stop: it needs the separate immutable-Proto intake
   described below.
2. Add the smallest valid declaration to
   `packages/validation/tests/proto/test-when.proto` (or a new project-owned
   fixture beside it). For `(when)`, `TimeValidation.future_timestamp` declares
   `google.protobuf.Timestamp future_timestamp = 2 [(when).in = FUTURE];`.
3. Add a failing generated-schema test in
   `packages/validation/tests/when.test.ts`. The existing model fixes the clock
   with `ValidationClock.set()` and validates `TimeValidationSchema` created by
   the fixture. Start with the expected field path and diagnostic shape, not an
   implementation detail.
4. Run `corepack pnpm generate`. This refreshes the generated extension module at
   `packages/validation/src/generated/spine/time_options_pb.ts` and the test
   fixture module at `packages/validation/tests/generated/test-when_pb.ts`.
   Generated files are output, not editing targets.
5. Import the generated extension in
   `packages/validation/src/options-registry.ts` and add its stable name to
   `optionRegistry`. `(when)` imports `when` from
   `./generated/spine/time_options_pb.js` and registers it as `when`.
6. Implement the option owner under `packages/validation/src/options/`; the
   `(when)` owner is `packages/validation/src/options/when.ts` and reads its
   extension with `ValidationOptions.get("when")`. Add the narrowest validation,
   configuration-error, and diagnostic behavior needed by the test.
7. Wire field-level behavior into the ordered `fieldValidators` array in
   `packages/validation/src/validation.ts`. `(when)` calls `When.validate`.
   Use `ValidationOrchestration.adaptAllFieldsValidator()` only when the option
   already evaluates all fields together, as `(pattern)` does; ordinary
   field-level options do not need a new orchestration abstraction.
8. Update the [package guide](../README.md),
   [validation contract](validation-contract.md), and the executable example
   when the option is useful to consumers. Add public TSDoc only if an exported
   API changes.

Run the sequence below after each relevant step:

```bash
corepack pnpm generate
corepack pnpm exec vitest run packages/validation/tests/when.test.ts
corepack pnpm test:validation
corepack pnpm proto:lint
corepack pnpm docs:check
```

### Modify existing behavior test-first

For a concrete `(when)` example, suppose equality with the clock must become a
failure instead of the current accepted boundary. In
`packages/validation/tests/when.test.ts`, change the first test’s final
assertion before changing source:

```text
import { create } from "@bufbuild/protobuf";
import { ValidationClock } from "../src/clock.js";
import { validate } from "../src/index.js";
import { TimeValidationSchema } from "./generated/test-when_pb.js";

const now = { seconds: 1_704_067_200n, nanos: 0 };

beforeEach(() => ValidationClock.set(() => now));
afterEach(() => ValidationClock.set());

it("rejects equality with now", () => {
  const message = create(TimeValidationSchema, {
    pastTimestamp: now,
    futureTimestamp: now,
    disabled: { seconds: 0n, nanos: 0 },
  });

  expect(validate(TimeValidationSchema, message)).toHaveLength(2);
});
```

That assertion fails against the current behavior. The smallest implementation
target is the `valid` comparison in `When.validate` in
`packages/validation/src/options/when.ts`; update only the relevant inclusive
comparison, then rerun:

```bash
corepack pnpm generate
corepack pnpm exec vitest run packages/validation/tests/when.test.ts
corepack pnpm exec vitest run packages/validation/tests/when-contract.test.ts
corepack pnpm test:validation
```

Use generated schemas and real descriptors instead of mocks. Add an integration
test when traversal, nesting, paths, or option composition changes.

### Change project-owned Proto fixtures or immutable upstream inputs

For a project-owned fixture, edit a file under
`packages/validation/tests/proto/` or `packages/example/proto/`, then run:

```bash
corepack pnpm generate
corepack pnpm proto:lint
corepack pnpm test:validation
```

Never edit vendored Spine inputs such as `spine/options.proto`,
`spine/time_options.proto`, or `spine/time/time.proto`. Before fetching,
changing, or recording a vendored file or its manifest entry, obtain separate
approval for immutable-Proto intake and compatibility review. The approved
intake retrieves the input byte-for-byte at an exact upstream commit and records
its repository, commit, path, URL, retrieval date, local path, and SHA-256 in
the source manifest. Then run `corepack pnpm proto:verify`, generation, and linting.
See [the immutable Proto guide](../../../build-protocol/proto/README.md).

### Update a public API

1. Update `packages/validation/src/index.ts` and the affected exported source
   declaration.
2. Update the package README TypeScript example and public TSDoc together.
3. Run:

```bash
corepack pnpm generate
corepack pnpm typecheck:generated
corepack pnpm test:validation
corepack pnpm docs:check
```

### Update the executable example

1. Update the valid runnable Proto under `packages/example/proto/` and the
   matching scenario in `packages/example/src/scenarios.ts`.
2. Update `packages/example/tests/scenarios.test.ts` and
   `packages/example/README.md`.
3. Run:

```bash
corepack pnpm generate
corepack pnpm build
corepack pnpm test:example
corepack pnpm docs:check
```

Invalid option declarations belong only under `packages/example/proto/testing/`.

### Update documentation

1. Update the consumer-facing package README, example README, or package-local
   reference that owns the claim.
2. Run:

```bash
corepack pnpm docs:check
corepack pnpm format:check
git diff --check
```

### Update a dependency

1. Update the owning manifest: root `package.json` for shared tooling,
   `packages/validation/package.json` for published-package dependencies, or
   `packages/example/package.json` for example-only dependencies.
2. Refresh the lockfile and verify the exact workspace:

```bash
corepack pnpm install --lockfile-only
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck:generated
corepack pnpm test:validation
corepack pnpm build
corepack pnpm test:example
```

Do not edit the lockfile by hand. Explain why the dependency is needed and
check its Node.js and TypeScript compatibility before proposing the change.

### Change the framework version

Follow the concise version-change rule in [the contribution guide](contributing.md).

## Troubleshooting

| Symptom                                                  | Likely cause and resolution                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| pnpm is not available as a shell command                 | Run the command as `corepack pnpm <script>`; this does not install a system shim.                              |
| Corepack cannot obtain pnpm                              | Connect the host to the network so Corepack can download the pinned pnpm release.                              |
| Install cannot find packages                             | Connect the host to the network so pnpm can fill its cold package store.                                       |
| Example root test cannot resolve validation `dist`       | Run `corepack pnpm build`, then rerun `corepack pnpm test:example`.                                            |
| Generated imports or fixtures are missing                | Run `corepack pnpm generate`; never add generated files manually.                                              |
| `corepack pnpm proto:verify` reports a checksum mismatch | Restore the immutable file; use the separate approved intake procedure for an intended upstream replacement.   |
| A docs TypeScript snippet fails                          | Import only public package exports and use ESM `.js` relative imports.                                         |
| A time check differs by zone or range                    | Read the `(when)` conversion details in the validation contract and include the exact input in a focused test. |

## Verification Before a Pull Request

Inspect the diff and run the checks that cover the change. For broad changes,
run the complete gate:

```bash
corepack pnpm verify
```

The contribution guide explains branches, commits, pull requests, and the
restriction on `master`.
