# Spine Validation — Example Project

A small, runnable application that demonstrates validating Protobuf-ES v2
messages with [Spine Validation](https://github.com/SpineEventEngine/validation/)
constraints.

## 💡 What This Example Shows

- ✅ Declaring Spine Validation options in `.proto` files.
- ✅ Generating TypeScript with Buf and Protobuf-ES.
- ✅ Validating messages at runtime and formatting violations.
- ✅ Required values, patterns, numeric limits, ranges, distinct collections,
  nested messages, and known `Any` payloads.
- ✅ Spine Time `(when)` checks for timestamps in the past and future.

The source is deliberately small. Read the [package guide](../validation/README.md)
for the public API and option-by-option behavior.

## 🚀 Quick Start

From the repository root, use the Node.js version in [`.node-version`](../../.node-version)
and the committed pnpm version:

```bash
corepack pnpm install --frozen-lockfile
pnpm example
```

`pnpm example` builds the validation package, generates this example’s TypeScript,
builds the example, and prints every scenario.

## 🎯 Scenarios

The example runs a fixed, inspectable set of messages:

- a user with missing required name and email values;
- duplicate user tags and an invalid email pattern;
- accepted and rejected timestamp `(when)` constraints;
- a product at its inclusive minimum price;
- leaf violations inside a nested category;
- leaf violations within a known `google.protobuf.Any` payload; and
- a test-only invalid option declaration that produces
  `ValidationConfigurationError`.

The runnable schemas are in [`proto/`](proto/), the scenarios are in
[`src/scenarios.ts`](src/scenarios.ts), and their assertions are in
[`tests/scenarios.test.ts`](tests/scenarios.test.ts).

## 🧪 Run The Example Tests

```bash
pnpm test:example
```

The test command builds the validation package first, then generates the example
schemas and runs its Vitest tests. If you only want the generated TypeScript,
run `pnpm --filter @spine-event-engine/example-smoke generate`.

## 🕰️ Time Options

`proto/user.proto` imports `spine/time_options.proto` and applies `(when)` to
two `google.protobuf.Timestamp` fields:

```protobuf
google.protobuf.Timestamp issued_at = 6 [(when).in = PAST];
google.protobuf.Timestamp expires_at = 7 [(when).in = FUTURE];
```

The example includes one message that satisfies both rules and one that violates
both. See the [validation contract](../validation/docs/validation-contract.md)
for supported Spine Time message types and conversion details.

## 📚 Next Steps

- [Package guide](../validation/README.md) — install and use the library.
- [Development guide](../validation/docs/development.md) — build, test, and extend the workspace.
- [Contribution guide](../validation/docs/contributing.md) — prepare a change for review.

## License

Apache License 2.0.
