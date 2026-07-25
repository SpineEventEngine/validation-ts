# Spine Validation TypeScript example

An executable Protobuf-ES consumer of
`@spine-event-engine/validation`, not a second validation implementation.

## What This Example Shows

- Defining valid project-owned Protobuf messages with Spine options.
- Validating generated User and Product schemas at runtime.
- Handling violations through inspectable scenario results.
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

This command builds the validation workspace package, generates schemas, and
then executes the example. It will:

1. Generate TypeScript code from `.proto` files.
2. Build the TypeScript code.
3. Run the example showing five deterministic scenarios.

## Test

```bash
npm run test:example
```

The test asserts root type names, complete field paths, formatted diagnostics, duplicate representation, leaf-only nesting, exact-bound acceptance, and known `Any` unpacking. Invalid option targets belong only in test fixtures, never these runnable declarations.

For setup and option semantics, see the [user guide](../../docs/user-guide.md)
and [validation contract](../../docs/validation-contract.md). For contribution
rules, see [contributing](../../docs/contributing.md).

## License

Apache License 2.0.
