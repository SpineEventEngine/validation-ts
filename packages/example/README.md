# Spine Validation TypeScript - Example Project

A standalone example demonstrating runtime validation of Protobuf messages
with [Spine Validation](https://github.com/SpineEventEngine/validation/) constraints.

## What This Example Shows

- ✅ Defining Protobuf messages with Spine Validation options.
- ✅ Validating messages at runtime and formatting violations.
- ✅ Programmatically handling validation violations.
- ✅ Required values, patterns, ranges, distinct collections, nested messages,
  known `Any` payloads, and Spine Time `(when)` checks.

For public API details and option-by-option behavior, read the
[package guide](../validation/README.md).

## Quick Start

### Install dependencies

From the repository root, use the Node.js version in
[`.node-version`](../../.node-version):

```bash
corepack enable pnpm
corepack pnpm install --frozen-lockfile
```

On a cold host, Corepack may need network access for the pinned pnpm release;
a cold pnpm store may then download the locked packages.

### Run the example

```bash
pnpm example
```

This generates TypeScript from `.proto` files, builds the validation package and
example, then prints the runnable scenarios.

### Run the example tests

```bash
pnpm build
pnpm test:example
```

This clean-checkout-safe sequence builds validation `dist`, generates example
schemas, and runs the example’s Vitest tests.

## Scenarios

The console shows messages with missing user values, duplicate tags, an invalid
email pattern, accepted and rejected timestamp `(when)` constraints, a product
at its exact minimum price, nested category leaf violations, and known
`google.protobuf.Any` payload leaf violations.

The runnable schemas are in [`proto/`](proto/), scenarios are in
[`src/scenarios.ts`](src/scenarios.ts), and assertions are in
[`tests/scenarios.test.ts`](tests/scenarios.test.ts).

`proto/testing/invalid_configuration.proto` is tests-only. It demonstrates a
configuration error and is not a console scenario or runnable example schema.

## Time Options

`proto/user.proto` imports `spine/time_options.proto` and applies `(when)` to
two `google.protobuf.Timestamp` fields:

```protobuf
google.protobuf.Timestamp issued_at = 6 [(when).in = PAST];
google.protobuf.Timestamp expires_at = 7 [(when).in = FUTURE];
```

The example includes one message that satisfies both rules and one that violates
both. See the [validation contract](../validation/docs/validation-contract.md)
for supported Spine Time message types and conversion details.

## Next Steps

- [Package guide](../validation/README.md) — install and use the library.
- [Development guide](../validation/docs/development.md) — build, test, and extend the workspace.
- [Contribution guide](../validation/docs/contributing.md) — prepare a pull request.

## License

Apache License 2.0.
