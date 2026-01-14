# @spine-event-engine/validation-ts

TypeScript validation library for Protobuf messages with [Spine Validation](https://github.com/SpineEventEngine/validation/) options.

## Features

- ✅ Runtime validation of Protobuf messages against Spine validation constraints
- ✅ Support for all major Spine validation options
- ✅ Custom error messages with placeholder substitution
- ✅ Type-safe validation with full TypeScript support
- ✅ Works with [@bufbuild/protobuf](https://github.com/bufbuild/protobuf-es) (Protobuf-ES v2)
- ✅ Comprehensive test coverage (223 tests)

## Installation

```bash
npm install @spine-event-engine/validation-ts
```

## Prerequisites

This library requires:
- `@bufbuild/protobuf` v2.10.2 or later

The package includes:
- Spine validation Proto definitions (`spine/options.proto`)
- TypeScript validation implementation
- Pre-configured TypeScript build

## Quick Start

```typescript
import { create } from '@bufbuild/protobuf';
import { validate, formatViolations } from '@spine-event-engine/validation-ts';
import { UserSchema } from './generated/user_pb';

// Create a message with validation constraints.
const user = create(UserSchema, {
    name: '',  // This field is marked as `(required) = true`.
    email: ''  // This field is also required.
});

// Validate the message.
const violations = validate(UserSchema, user);

if (violations.length > 0) {
    console.log('Validation failed:');
    console.log(formatViolations(violations));
    // Output:
    // 1. example.User.name: A value must be set.
    // 2. example.User.email: A value must be set.
}
```

## API Reference

### `validate(schema, message)`

Validates a Protobuf message against its Spine validation constraints.

**Parameters:**
- `schema`: the message schema (e.g., `UserSchema`)
- `message`: the message instance to validate

**Returns:** array of `ConstraintViolation` objects (empty if valid)

### `formatViolations(violations)`

Formats validation violations into a human-readable string.

**Parameters:**
- `violations`: array of constraint violations

**Returns:** formatted string describing all violations

### `formatTemplateString(template, values)`

Formats a `TemplateString` by replacing placeholders with provided values.

**Parameters:**
- `template`: template string with placeholders (e.g., `{value}`, `{other}`)
- `values`: object mapping placeholder names to their values

**Returns:** formatted string with placeholders replaced

## Supported Validation Options

### Field-level options

- ✅ **`(required)`** - Ensures field has a non-default value
- ✅ **`(if_missing)`** - Custom error message for required fields
- ✅ **`(pattern)`** - Regex validation for string fields
- ✅ **`(min)` / `(max)`** - Numeric range validation with inclusive/exclusive bounds
- ✅ **`(range)`** - Bounded numeric ranges using bracket notation `[min..max]`, with custom error messages
- ✅ **`(distinct)`** - Ensures unique elements in repeated fields and map values
- ✅ **`(validate)`** - Enables recursive validation of nested messages
- ✅ **`(goes)`** - Field dependency validation (field can only be set if another field is set)

### Message-level options

- ✅ **`(require)`** - Requires specific field combinations using boolean logic

### Oneof-level options

- ✅ **`(choice)`** - Requires that a `oneof` group has at least one field set

### Not Supported

- ❌ **`(set_once)`** - Requires state tracking across validations (not feasible in TypeScript runtime)
- ❌ **`(if_set_again)`** - Companion to `(set_once)`
- ❌ **`(required_field)`** - Deprecated, replaced by `(require)`
- ❌ **`(is_required)`** - Deprecated, replaced by `(choice)`

## Example

```protobuf
syntax = "proto3";

import "spine/options.proto";

message User {
    option (require).fields = "id | email";

    int32 id = 1 [
        (set_once) = true,
        (min).value = "1"
    ];

    string name = 2 [
        (required) = true,
        (pattern).regex = "^[A-Za-z][A-Za-z0-9 ]{1,49}$",
        (pattern).error_msg = "Name must start with a letter and be 2-50 characters."
    ];

    string email = 3 [
        (required) = true,
        (pattern).regex = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        (pattern).error_msg = "Email must be valid."
    ];

    int32 age = 4 [
        (range).value = "[13..120]"
    ];

    repeated string tags = 5 [
        (distinct) = true
    ];

    map<string, string> preferences = 6 [
        (distinct) = true  // Values must be unique.
    ];
}

message Address {
    string street = 1 [(required) = true];
    string city = 2 [(required) = true];
    string zip_code = 3 [
        (pattern).regex = "^[0-9]{5}$"
    ];
}

message UserProfile {
    User user = 1 [
        (required) = true,
        (validate) = true
    ];

    Address address = 2 [
        (validate) = true
    ];
}
```

## Validation Behavior

### Proto3 field semantics

In `proto3`, fields have default values:
- Numeric fields default to `0`
- String fields default to `""`
- Bool fields default to `false`
- Message fields default to `undefined`

The `(required)` validator considers a field "set" when:
- String fields are non-empty
- Numeric fields are non-zero
- Bool fields are `true` or `false` (both count as set)
- Message fields are not `undefined`
- Repeated fields have at least one element

### Nested validation

Use `(validate) = true` on message fields to recursively validate nested messages:

```protobuf
message Order {
    Product product = 1 [
        (required) = true,
        (validate) = true  // Validates Product's constraints too.
    ];
}
```

### Field dependencies

Use `(goes)` to enforce field dependencies:

```protobuf
message ShippingDetails {
    string tracking_number = 1 [
        (goes).with = "carrier",
        (goes).error_msg = "Tracking number requires carrier to be set."
    ];
    string carrier = 2 [(goes).with = "tracking_number"];
}
```

### Required field combinations

Use `(require)` for complex field requirements:

```protobuf
message ContactInfo {
    option (require).fields = "(phone & country_code) | email";

    string phone = 1;
    string country_code = 2;
    string email = 3;
}
```

### `Oneof` constraints

Use `(choice)` to require that a `oneof` group has a field set:

```protobuf
message PaymentMethod {
    oneof method {
        option (choice).required = true;
        option (choice).error_msg = "Payment method is required.";

        CreditCard credit_card = 1;
        BankAccount bank_account = 2;
        PayPal paypal = 3;
    }
}
```

## Testing

The package includes comprehensive test coverage with 200+ tests across 11 test suites:

- `basic-validation.test.ts` - Basic validation and formatting
- `required.test.ts` - `(required)` and `(if_missing)` options
- `pattern.test.ts` - `(pattern)` regex validation
- `required-field.test.ts` - `(require)` message-level option
- `min-max.test.ts` - `(min)` and `(max)` numeric validation
- `range.test.ts` - `(range)` bracket notation
- `distinct.test.ts` - `(distinct)` uniqueness validation
- `validate.test.ts` - `(validate)` nested validation
- `goes.test.ts` - `(goes)` field dependency validation
- `choice.test.ts` - `(choice)` `oneof` validation
- `integration.test.ts` - Complex multi-option scenarios

Run tests with:

```bash
npm test
```

## Development Notes

### Generated Code Patching

The package uses a post-generation script ([scripts/patch-generated.js](scripts/patch-generated.js)) to handle 
JavaScript reserved word conflicts in generated Protobuf code.

**Issue:**

The Spine `(require)` option generates an export named `require` in the TypeScript output:

```typescript
export const require: GenExtension<MessageOptions, RequireOption>
```

However, `require` is a reserved identifier in Node.js/CommonJS, which can cause issues with module systems and tooling.

**Solution:**

After running `buf generate`, the patch script automatically renames the export to `requireFields`:

```typescript
export const requireFields: GenExtension<MessageOptions, RequireOption>
```

This happens automatically as part of the build process:

```json
{
  "scripts": {
    "generate": "buf generate && node scripts/patch-generated.js"
  }
}
```

The script patches both the main generated files and test generated files, ensuring consistency across the codebase. 
This approach allows us to use the standard `(require)` option name in proto files while avoiding conflicts in the generated TypeScript code.

## License

Apache License 2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
