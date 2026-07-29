# Spine Validation TypeScript example

An executable Protobuf-ES consumer of
`@spine-event-engine/validation`, not a second validator implementation.

It demonstrates generated user and product schemas, formatted diagnostics,
duplicate-tag equality classes, leaf-only nested failures, known
`google.protobuf.Any` payloads, and accepted/rejected `(when)` timestamps.
Runnable schemas intentionally contain no invalid option targets.

## Run

From the workspace root:

```sh
corepack pnpm install --frozen-lockfile
pnpm example
```

The command generates schemas, builds the package and example, then prints
eight deterministic scenarios. Run the example tests with:

```sh
pnpm test:example
```

For consumer setup and option semantics, start with the
[package guide](../validation/README.md). Repository-only development material
is in the [development reference](../validation/docs/README.md).

## License

Apache-2.0.
