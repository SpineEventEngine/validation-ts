# @spine-event-engine/validation-ts

TypeScript validation library for Protobuf messages with [Spine Event Engine](https://spine.io/) validation options.

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
- Protobuf definitions with Spine validation options

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
- `schema`: The message schema (e.g., `UserSchema`)
- `message`: The message instance to validate

**Returns:** Array of `ConstraintViolation` objects (empty if valid)

### `formatViolations(violations)`

Formats validation violations into a human-readable string.

**Parameters:**
- `violations`: Array of constraint violations

**Returns:** Formatted string describing all violations

### `formatTemplateString(template, values)`

Formats a `TemplateString` by replacing placeholders with provided values.

**Parameters:**
- `template`: Template string with placeholders (e.g., `{value}`, `{other}`)
- `values`: Object mapping placeholder names to their values

**Returns:** Formatted string with placeholders replaced

## Supported Validation Options

### Field-Level Options

- ✅ **`(required)`** - Ensures field has a non-default value
- ✅ **`(if_missing)`** - Custom error message for required fields
- ✅ **`(pattern)`** - Regex validation for string fields
- ✅ **`(min)` / `(max)`** - Numeric range validation with inclusive/exclusive bounds
- ✅ **`(range)`** - Bounded numeric ranges using bracket notation `[min..max]`
- ✅ **`(distinct)`** - Ensures unique elements in repeated fields
- ✅ **`(validate)`** - Enables recursive validation of nested messages
- ✅ **`(if_invalid)`** - Custom error message for nested validation failures
- ✅ **`(goes)`** - Field dependency validation (field can only be set if another field is set)

### Message-Level Options

- ✅ **`(required_field)`** - Requires specific field combinations using boolean logic

### Oneof-Level Options

- ✅ **`(is_required)`** - Requires that one of the oneof fields must be set

## Example Proto File

```protobuf
syntax = "proto3";

import "spine/options.proto";

message User {
    option (required_field) = "id | email";

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
        (range) = "[13..120]"
    ];

    repeated string tags = 5 [
        (distinct) = true
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
        (validate) = true,
        (if_invalid).error_msg = "User data is invalid."
    ];

    Address address = 2 [
        (validate) = true
    ];
}
```

## Validation Behavior

### Proto3 Field Semantics

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

### Nested Validation

Use `(validate) = true` on message fields to recursively validate nested messages:

```protobuf
message Order {
    Product product = 1 [
        (required) = true,
        (validate) = true  // Validates Product's constraints too.
    ];
}
```

### Field Dependencies

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

### Required Field Combinations

Use `(required_field)` for complex field requirements:

```protobuf
message ContactInfo {
    option (required_field) = "(phone & country_code) | email";

    string phone = 1;
    string country_code = 2;
    string email = 3;
}
```

## Testing

The package includes comprehensive test coverage with 223 tests across 10 test suites:

- `basic-validation.test.ts` - Basic validation and formatting
- `required.test.ts` - `(required)` and `(if_missing)` options
- `pattern.test.ts` - `(pattern)` regex validation
- `required-field.test.ts` - `(required_field)` message-level option
- `min-max.test.ts` - `(min)` and `(max)` numeric validation
- `range.test.ts` - `(range)` bracket notation
- `distinct.test.ts` - `(distinct)` uniqueness validation
- `validate.test.ts` - `(validate)` and `(if_invalid)` nested validation
- `goes.test.ts` - `(goes)` field dependency validation
- `integration.test.ts` - Complex multi-option scenarios

Run tests with:

```bash
npm test
```

## License

Apache License 2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
