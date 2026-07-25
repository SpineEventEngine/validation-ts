# Spine Validation TypeScript - Example Project

A standalone example demonstrating runtime validation of Protobuf messages
with [Spine Validation](https://github.com/SpineEventEngine/validation/) constraints.

## What This Example Shows

- Defining Protobuf messages with Spine Validation options.
- Validating messages at runtime.
- Programmatically handling validation violations.
- Inspectable scenario results behind a console adapter, using real Buf-generated schemas.
- User presence and duplicate-tag equality classes; Product exact numeric minimum and nested leaf-only paths.
- Known `google.protobuf.Any` payload validation. The runnable schemas intentionally contain no invalid option targets.

## Quick Start

### Install dependencies

```bash
npm ci
```

### Run the example

```bash
npm run example
```

This will:

1. Generate TypeScript code from `.proto` files.
2. Build the TypeScript code.
3. Run the example showing five deterministic scenarios.

## Test

```bash
npm run test:example
```

The test asserts root type names, complete field paths, formatted diagnostics, duplicate representation, leaf-only nesting, exact-bound acceptance, and known `Any` unpacking. Invalid option targets belong only in test fixtures, never these runnable declarations.

For option semantics and limitations, see the [validation contract](../../docs/validation-contract.md).

## License

Apache License 2.0.
