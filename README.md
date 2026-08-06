# Spine Validation — TypeScript Client Library

Requires Node.js 24 or later; development and CI pin and test Node.js 24.18.0.

A TypeScript validation library for Protobuf messages using [Spine Validation](https://github.com/SpineEventEngine/validation/) options,
built on [@bufbuild/protobuf](https://github.com/bufbuild/protobuf-es) (Protobuf-ES v2).

> **🔧 This library is in its experimental stage, the public API should not be considered stable.**

## 💡 Why Use This?

### For Spine Event Engine Users

This library lets you:

- ✅ **Reuse the same validation rules** in your frontend that you defined in your backend.
- ✅ **Maintain a single source of truth** — validation logic lives in your `.proto` files.
- ✅ **Keep frontend and backend validation in sync** automatically.
- ✅ **Get type-safe validation** with full TypeScript support.
- ✅ **Use error-message templates** defined by the same Proto options.

### For New Users

Even if you're not using Spine Event Engine, this library provides a way
to add runtime validation to your Protobuf-based TypeScript applications:

- ✅ **Define validation in `.proto` files** using declarative [Spine Validation options](https://github.com/SpineEventEngine/base-libraries/blob/master/base/src/main/proto/spine/options.proto).
- ✅ **Type-safe, runtime validation** for Protobuf messages.
- ✅ **Clear, customizable error messages** for better UX.
- ✅ **Works with Protobuf-ES v2** and modern tooling.

## ✨ Features

**Comprehensive Validation Support**

- **`(required)`** — Validate the supported Proto-defined presence targets.
- **`(pattern)`** — Regex validation for strings.
- **`(min)` / `(max)`** — Numeric bounds with inclusive/exclusive support.
- **`(range)`** — Bounded ranges with bracket notation `(min..max]`.
- **`(distinct)`** — Enforce uniqueness in repeated fields.
- **`(validate)`** — Recursive nested message validation.
- **`(goes)`** — Field dependency constraints.
- **`(require)`** — Complex required field combinations with boolean logic.
- **`(choice)`** — Require that a `oneof` group has at least one field set.
- **`(when)`** — Validate Spine Time values against past/future bounds; copy the
  official [`spine/time_options.proto`](packages/validation/proto/spine/time_options.proto)
  and its required Spine Time Proto files unchanged onto the import path.

**Developer Experience**

- 🚀 Full TypeScript type safety.
- 📝 Custom error messages.
- 🧪 Comprehensive contract and regression tests.
- 📚 Extensive documentation.
- 🎨 Clean, readable error formatting.

### ⚠️ Known Limitations

- **`(set_once)`** — Not currently supported. This option requires state tracking across multiple validations,
  which is outside the scope of single-message validation.
- **`(pattern)`** — Uses ECMAScript `RegExp`; the official Proto documentation uses Java `Pattern` as its syntax
  baseline. See the [package regular-expression limitation](packages/validation/README.md#regular-expressions).

## 🚀 Getting Started

See the [package guide](packages/validation/README.md), the
[development reference](packages/validation/docs/README.md), the
[development guide](packages/validation/docs/development.md), and the
[executable example](packages/example/README.md).

`@spine-event-engine/validation` is not yet available from the public npm
registry. See the [package guide](packages/validation/README.md) for the API
and release status, or run the [executable example](packages/example/README.md)
from this repository.

---

## 📦 What's Included

This repository is structured as a pnpm workspace:

```
validation-ts/
├── packages/
│   ├── validation/              # 📦 Main validation package
│   │   ├── src/                 # Source code
│   │   ├── tests/               # Contract and regression tests
│   │   ├── proto/               # Official Spine and project Proto files
│   │   ├── docs/                # Repository-only development reference
│   │   └── README.md            # Full package documentation
│   │
│   └── example/                 # 🎯 Example project
│       ├── proto/               # Example proto files
│       ├── src/                 # Example usage code
│       └── README.md            # Example documentation
│
└── README.md                    # You are here
```

## 🎓 Documentation

See the [package-level README](packages/validation/README.md) for consumer
setup and API details. The [development reference](packages/validation/docs/README.md)
contains architecture, exact validation behavior, and local development notes.

---

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd validation-ts

# Install with the pinned pnpm release without installing a system shim
corepack pnpm install --frozen-lockfile
```

On a cold host, Corepack may need network access for the pinned pnpm release;
a cold pnpm store may then download the packages in the committed lockfile.

### Build & Test

```bash
# Run the complete local and CI quality gate
corepack pnpm verify
```

### Workspace Scripts

| Command                 | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `corepack pnpm verify`  | Run generation, typechecking, lint, format, coverage, docs, Proto, and package checks |
| `corepack pnpm build`   | Build the package and example                                                         |
| `corepack pnpm test`    | Run validation-package and executable-example Vitest tests                            |
| `corepack pnpm example` | Run the example project                                                               |

---

## 🤝 Contributing

See the [contribution guide](packages/validation/docs/contributing.md) for
review and delivery practices, and the
[development guide](packages/validation/docs/development.md) for local setup,
generated inputs, extension workflows, and verification.

---

## 📄 License

Apache 2.0.

---

## 🔗 Related Projects

- [Protobuf-ES](https://github.com/bufbuild/protobuf-es) — Protocol Buffers for ECMAScript
- [Buf](https://buf.build/) — Modern Protobuf tooling

---

<div align="center">

**Made with ❤️ for the Spine Event Engine ecosystem.**

[Documentation](packages/validation/README.md) · [Examples](packages/example) · [Report Bug](https://github.com/SpineEventEngine/validation-ts/issues)

</div>

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Protobuf-ES](https://img.shields.io/badge/protobuf--es-v2-green.svg)](https://github.com/bufbuild/protobuf-es)
