# Spine Validation for TypeScript

_Runtime validation for Protobuf messages with [Spine Event Engine](https://spine.io/) Validation constraints._

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Protobuf-ES](https://img.shields.io/badge/protobuf--es-v2-green.svg)](https://github.com/bufbuild/protobuf-es)

A TypeScript validation library for Protobuf messages using Spine validation options, built on [@bufbuild/protobuf](https://github.com/bufbuild/protobuf-es) (Protobuf-ES v2).

---

## 💡 Why Use This?

### For Spine Event Engine users

**You already have validation rules in your backend.** Now bring them to your TypeScript/JavaScript frontend with zero duplication!

If you're using the [Validation library](https://github.com/SpineEventEngine/validation/) on the server side, 
your Protobuf messages already have validation constraints defined using Spine options like `(required)`, `(pattern)`, `(min)`, `(max)`, etc.

**This library lets you:**
- ✅ **Reuse the same validation rules** in your frontend that you defined in your backend.
- ✅ **Maintain a single source of truth** - validation logic lives in your `.proto` files.
- ✅ **Keep frontend and backend validation in sync** automatically.
- ✅ **Get type-safe validation** with full TypeScript support.
- ✅ **Display the same error messages** to users that your backend generates.

**No code duplication. No maintenance burden. Just add this library and validate.**

### For new users

Even if you're not using Spine Event Engine, this library provides a powerful way to add runtime validation to your Protobuf-based TypeScript applications:

- ✅ **Define validation in `.proto` files** using declarative Spine validation options.
- ✅ **Type-safe, runtime validation** for your Protobuf messages.
- ✅ **Clear, customizable error messages** for better UX.
- ✅ **Works with Protobuf-ES v2** and modern tooling.
- ✅ **Extensible architecture** for custom validation logic.

---

## ✨ Features

**Comprehensive Validation support:**

-  **`(required)`** - Ensure fields have non-default values.
-  **`(pattern)`** - Regex validation for strings.
-  **`(min)` / `(max)`** - Numeric bounds with inclusive/exclusive support.
-  **`(range)`** - Bounded ranges with bracket notation `[min..max]`.
-  **`(distinct)`** - Enforce uniqueness in repeated fields.
- ️ **`(validate)`** - Recursive nested message validation.
-  **`(goes)`** - Field dependency constraints.
-  **`(required_field)`** - Complex required field combinations with boolean logic.

**Developer experience:**

- 🚀 Full TypeScript type safety.
- 📝 Custom error messages.
- 🧪 223+ comprehensive tests.
- 📚 Extensive documentation.
- 🎨 Clean, readable error formatting.

### ⚠️ Known limitations

- **`(set_once)`** - Not currently supported. This option requires state tracking across multiple validations, which is outside the scope of single-message validation. If you need this feature, please [open an issue](../../issues).

---

## 🚀 Quick Start

### Installation

```bash
npm install @spine-event-engine/validation-ts @bufbuild/protobuf
```

### Basic Usage

**Step 1: Define validation in your `.proto` file**

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

**Step 2: Use validation in TypeScript**

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
│   │   ├── tests/               # Tests
│   │   ├── proto/               # Spine proto definitions
│   │   └── README.md            # The package documentation
│   │
│   └── example/                 # 🎯 Example project
│       ├── proto/               # Example proto files
│       ├── src/                 # Example usage code
│       └── README.md            # Example documentation
│
└── README.md                    # You are here
```

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

### Build & test

```bash
# Build the validation package
npm run build

# Run all tests (223 tests)
npm test

# Run the example project
npm run example
```

### Workspace scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the validation package. |
| `npm test` | Run all validation tests. |
| `npm run example` | Run the example project. |

---

## 📋 Validation Options Reference

### Field-level options

| Option | Description | Example |
|--------|-------------|---------|
| `(required)` | Field must have a non-default value. | `[(required) = true]` |
| `(if_missing)` | Custom error for missing field. | `[(if_missing).error_msg = "Name is required"]` |
| `(pattern)` | Regex pattern matching. | `[(pattern).regex = "^[A-Z].*"]` |
| `(min)` / `(max)` | Numeric minimum/maximum. | `[(min).value = "0", (max).value = "100"]` |
| `(range)` | Bounded numeric range. | `[(range) = "[0..100]"]` |
| `(distinct)` | Unique repeated elements. | `[(distinct) = true]` |
| `(validate)` | Validate nested messages. | `[(validate) = true]` |
| `(if_invalid)` | Custom error for nested validation. | `[(if_invalid).error_msg = "Invalid address"]` |
| `(goes)` | Field dependency. | `[(goes).with = "other_field"]` |

### Message-level options

| Option | Description | Example |
|--------|-------------|---------|
| `(required_field)` | Required field combinations. | `option (required_field) = "id \| email";` |

### Not supported

| Option | Status | Notes |
|--------|--------|-------|
| `(set_once)` | ❌ Not supported | Requires state tracking across validations. See [limitations](#-known-limitations). |

---

## ✅ Test Coverage

The package includes comprehensive test coverage:

- **223 tests** across 10 test suites.
- **All validation options** thoroughly tested.
- **Integration tests** combining multiple constraints.
- **Edge cases** and real-world scenarios.
- **100% coverage** of validation logic.


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

1. All tests pass: `npm run test`.
2. Code follows existing patterns.
3. New features include tests.
4. Documentation is updated.

---

## 📄 License

Apache 2.0.

---

<div align="center">

**Made with ❤️ for the Spine Event Engine ecosystem.**

[Documentation](packages/spine-validation-ts/README.md) · [Examples](packages/example) · [Report Bug](../../issues)

</div>
