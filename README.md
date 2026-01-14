# Spine Validation — TypeScript Client Library

> Runtime validation in TypeScript for Protobuf messages with [Spine Event Engine](https://spine.io/) Validation.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Protobuf-ES](https://img.shields.io/badge/protobuf--es-v2-green.svg)](https://github.com/bufbuild/protobuf-es)

A TypeScript validation library for Protobuf messages using Spine validation options, built on [@bufbuild/protobuf](https://github.com/bufbuild/protobuf-es) (Protobuf-ES v2).

---

## 💡 Why Use This?

### For Spine Event Engine Users

**You already have validation rules in your backend.** Now bring them to your TypeScript/JavaScript frontend with zero duplication!

If you're using [Spine Event Engine](https://spine.io/) with its Validation library on the server side, your Protobuf messages already have validation constraints defined using Spine options like `(required)`, `(pattern)`, `(min)`, `(max)`, etc.

**This library lets you:**
- ✅ **Reuse the same validation rules** in your frontend that you defined in your backend.
- ✅ **Maintain a single source of truth** - validation logic lives in your `.proto` files.
- ✅ **Keep frontend and backend validation in sync** automatically.
- ✅ **Get type-safe validation** with full TypeScript support.
- ✅ **Display the same error messages** to users that your backend generates.

### For New Users

Even if you're not using Spine Event Engine, this library provides a powerful way to add runtime validation to your Protobuf-based TypeScript applications:

- ✅ **Define validation in `.proto` files** using declarative Spine validation options.
- ✅ **Type-safe, runtime validation** for your Protobuf messages.
- ✅ **Clear, customizable error messages** for better UX.
- ✅ **Works with Protobuf-ES v2** and modern tooling.
- ✅ **Extensible architecture** for custom validation logic.

---

## ✨ Features

**Comprehensive Validation Support:**

- **`(required)`** - Ensure fields have non-default values.
- **`(pattern)`** - Regex validation for strings.
- **`(min)` / `(max)`** - Numeric bounds with inclusive/exclusive support.
- **`(range)`** - Bounded ranges with bracket notation `(min..max]`.
- **`(distinct)`** - Enforce uniqueness in repeated fields.
- **`(validate)`** - Recursive nested message validation.
- **`(goes)`** - Field dependency constraints.
- **`(require)`** - Complex required field combinations with boolean logic.
- **`(choice)`** - Require that a oneof group has at least one field set.

**Developer Experience:**

- 🚀 Full TypeScript type safety.
- 📝 Custom error messages.
- 🧪 200+ comprehensive tests.
- 📚 Extensive documentation.
- 🎨 Clean, readable error formatting.

### ⚠️ Known Limitations

- **`(set_once)`** - Not currently supported. This option requires state tracking across multiple validations, 
which is outside the scope of single-message validation.

---

## 🚀 Quick Start

### Installation

```bash
npm install @spine-event-engine/validation-ts @bufbuild/protobuf
```

### Basic Usage

**Step 1:** Define validation options in your `.proto` file:

```protobuf
syntax = "proto3";

import "spine/options.proto";

message User {
  string name = 1 [(required) = true];

  string email = 2 [
    (required) = true,
    (pattern).regex = "^[^@]+@[^@]+\\.[^@]+$",
    (pattern).error_msg = "Email must be valid. Provided: `{value}`."
  ];

  int32 age = 3 [
    (min).value = "0",
    (max).value = "150"
  ];

  repeated string tags = 4 [(distinct) = true];
}
```

**Step 2:** Use validation in TypeScript

```typescript
import { create } from '@bufbuild/protobuf';
import { validate, formatViolations } from '@spine-event-engine/validation-ts';
import { UserSchema } from './generated/user_pb';

// Create a message
const user = create(UserSchema, {
    name: '',   // Missing required field
    email: 'invalid-email'  // Invalid pattern
});

// Validate
const violations = validate(UserSchema, user);

if (violations.length > 0) {
    console.log(formatViolations(violations));
    // Output:
    // 1. User.name: A value must be set.
    // 2. User.email: Email must be valid. Provided: `invalid-email`.
}
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

---

## 🎓 Documentation

- **[Package README](packages/spine-validation-ts/README.md)** - Complete API documentation and usage guide.
- **[Descriptor API Guide](packages/spine-validation-ts/DESCRIPTOR_API_GUIDE.md)** - Working with message and field descriptors.
- **[Quick Reference](packages/spine-validation-ts/QUICK_REFERENCE.md)** - Cheat sheet for common operations.

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
| `npm run build` | Build the validation package. |
| `npm test` | Run all validation tests. |
| `npm run example` | Run the example project. |

---

## 📋 Validation Options Reference

### Field-Level Options

| Option | Description | Example |
|--------|-------------|---------|
| `(required)` | Field must have a non-default value. | `[(required) = true]` |
| `(if_missing)` | Custom error for missing field. | `[(if_missing).error_msg = "Name is required"]` |
| `(pattern)` | Regex pattern matching. | `[(pattern).regex = "^[A-Z].*"]` |
| `(min)` / `(max)` | Numeric minimum/maximum. | `[(min).value = "0", (max).value = "100"]` |
| `(range)` | Bounded numeric range. | `[(range) = "[0..100]"]` |
| `(distinct)` | Unique repeated elements. | `[(distinct) = true]` |
| `(validate)` | Validate nested messages. | `[(validate) = true]` |
| `(goes)` | Field dependency. | `[(goes).with = "other_field"]` |

### Message-Level Options

| Option | Description | Example |
|--------|-------------|---------|
| `(require)` | Required field combinations. | `option (require).fields = "id \| email";` |

### Oneof-Level Options

| Option | Description | Example |
|--------|-------------|---------|
| `(choice)` | Require oneof to have a field set. | `option (choice).required = true;` |

### Not Supported

| Option | Status | Notes |
|--------|--------|-------|
| `(set_once)` | ❌ Not supported | Requires state tracking across validations. See [limitations](#-known-limitations). |
| `(is_required)` | ❌ Not supported | Deprecated. Use `(choice)` instead. |
| `(required_field)` | ❌ Not supported | Deprecated. Use `(require)` instead. |

---

## ✅ Test Coverage

The package includes comprehensive test coverage:

- **200+ tests** across 11 test suites.
- **All validation options** thoroughly tested.
- **Integration tests** combining multiple constraints.
- **Edge cases** and real-world scenarios.
- **100% coverage** of validation logic.

Test suites:
- Basic validation.
- Required fields.
- Pattern matching.
- Min/Max constraints.
- Range validation.
- Distinct elements.
- Nested validation.
- Field dependencies (goes).
- Required field combinations (require).
- Oneof validation (choice).
- Integration scenarios.

---

## 📝 Example Output

When validation fails, you get clear, actionable error messages:

```
Validation failed:
1. User.name: A value must be set.
2. User.email: Email must be valid. Provided: `invalid-email`.
3. User.age: Value must be at least 0. Provided: -5.
4. User.tags: Values must be distinct. Duplicates found: ["test"].
```

---

## 🏗️ Architecture

The validation system is built with extensibility in mind:

- **`validation.ts`** - Core validation engine using the visitor pattern.
- **`options-registry.ts`** - Dynamic registration of validation options.
- **`options/`** - Modular validators for each Spine option.
- **Proto-first** - Validation rules defined in `.proto` files.
- **Type-safe** - Full TypeScript support with generated types.

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `npm test`.
2. Code follows existing patterns.
3. New features include tests.
4. Documentation is updated.

---

## 📄 License

Apache 2.0.

---

## 🔗 Related Projects

- [Spine Event Engine](https://spine.io/) - Event-driven framework for CQRS/ES applications.
- [Protobuf-ES](https://github.com/bufbuild/protobuf-es) - Protocol Buffers for ECMAScript.
- [Buf](https://buf.build/) - Modern Protobuf tooling.

---

<div align="center">

**Made with ❤️ for the Spine Event Engine ecosystem.**

[Documentation](packages/spine-validation-ts/README.md) · [Examples](packages/example) · [Report Bug](../../issues)

</div>
