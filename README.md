# Spine Validation — TypeScript Client Library

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
- ✅ **Display the same error messages** to users that your backend generates.

### For New Users

Even if you're not using Spine Event Engine, this library provides a powerful way 
to add runtime validation to your Protobuf-based TypeScript applications:

- ✅ **Define validation in `.proto` files** using declarative [Spine Validation options](https://github.com/SpineEventEngine/base-libraries/blob/master/base/src/main/proto/spine/options.proto).
- ✅ **Type-safe, runtime validation** for your Protobuf messages.
- ✅ **Clear, customizable error messages** for better UX.
- ✅ **Works with Protobuf-ES v2** and modern tooling.
- ✅ **Extensible architecture** for custom validation logic.


## ✨ Features

**Comprehensive Validation Support**

- **`(required)`** — Ensure fields have non-default values.
- **`(pattern)`** — Regex validation for strings.
- **`(min)` / `(max)`** — Numeric bounds with inclusive/exclusive support.
- **`(range)`** — Bounded ranges with bracket notation `(min..max]`.
- **`(distinct)`** — Enforce uniqueness in repeated fields.
- **`(validate)`** — Recursive nested message validation.
- **`(goes)`** — Field dependency constraints.
- **`(require)`** — Complex required field combinations with boolean logic.
- **`(choice)`** — Require that a `oneof` group has at least one field set.

**Developer Experience**

- 🚀 Full TypeScript type safety.
- 📝 Custom error messages.
- 🧪 200+ comprehensive tests.
- 📚 Extensive documentation.
- 🎨 Clean, readable error formatting.

### ⚠️ Known Limitations

- **`(set_once)`** — Not currently supported. This option requires state tracking across multiple validations,
which is outside the scope of single-message validation.


## 🚀 Getting Started

See the [package-level README](packages/spine-validation-ts/README.md) for complete installation instructions and usage guide.

**Quick install:**

```bash
npm install @spine-event-engine/validation-ts@snapshot @bufbuild/protobuf
```

---

## 📦 What's Included

This repository is structured as an npm workspace:

```
validation-ts/
├── packages/
│   ├── spine-validation-ts/     # 📦 Main validation package
│   │   ├── src/                 # Source code
│   │   ├── tests/               # 200+ comprehensive tests
│   │   ├── proto/               # Spine validation proto definitions
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

See the [package-level README](packages/spine-validation-ts/README.md) for more details.

---

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd validation-ts

# Install dependencies
npm install
```

### Build & Test

```bash
# Build the validation package
npm run build

# Run all tests
npm test

# Run the example project
npm run example
```

### Workspace Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the validation package |
| `npm test` | Run all validation tests |
| `npm run example` | Run the example project |

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `npm test`
2. Code follows existing patterns
3. New features include tests
4. Documentation is updated

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

[Documentation](packages/spine-validation-ts/README.md) · [Examples](packages/example) · [Report Bug](../../issues)

</div>

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Protobuf-ES](https://img.shields.io/badge/protobuf--es-v2-green.svg)](https://github.com/bufbuild/protobuf-es)

