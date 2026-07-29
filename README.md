# Spine Validation for TypeScript

`@spine-event-engine/validation` validates Protobuf-ES v2 messages against
Spine Validation options. It is an experimental ESM package for Node.js 24 or
later.

Start with the [package guide](packages/validation/README.md) for installation,
Buf setup, API use, option behavior, and limitations. The executable
[example](packages/example/README.md) demonstrates generated schemas in use.

## Quick install

```sh
pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf
```

### Alternative: exact preview version

```sh
pnpm add @spine-event-engine/validation@2.0.0-snapshot.6 @bufbuild/protobuf
```

The moving `snapshot` tag follows preview releases. The exact version is useful
when reproducibility matters.

## Development

Repository-only development material lives in
[packages/validation/docs](packages/validation/docs/README.md). The workspace
uses pnpm, Vitest, Buf, TypeScript, and Node.js 24:

```sh
corepack pnpm install --frozen-lockfile
pnpm verify
```

## License

Apache-2.0.
