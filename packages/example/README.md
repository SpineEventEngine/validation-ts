# Spine Validation TypeScript - Example Project

A standalone example demonstrating runtime validation of Protobuf messages with Spine validation constraints.

## What This Example Shows

- Defining Protobuf messages with Spine validation options.
- Validating messages at runtime.
- Programmatically handling validation violations.
- Various validation scenarios (required fields, patterns, ranges, etc.).

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run the Example

```bash
npm start
```

This will:
1. Generate TypeScript code from `.proto` files.
2. Build the TypeScript code.
3. Run the example showing various validation scenarios.

## Project Structure

```
example/
├── proto/
│   ├── user.proto              # User message with validation constraints
│   └── product.proto           # Product message with validation examples
├── src/
│   └── index.ts                # Example validation code
├── package.json
└── README.md                   # This file
```

## Expected Output

When you run the example, you'll see validation results for different scenarios:

```
=== Spine Validation Example ===

Example 1: Valid User
---------------------
Violations: 0
No violations

Example 2: Missing Required Email
----------------------------------
Violations: 1
1. example.User.email: A value must be set.

...
```

## Key Code Pattern

The example demonstrates the core validation pattern:

```typescript
import { create } from '@bufbuild/protobuf';
import { validate } from '@spine-event-engine/validation-ts';
import { UserSchema } from './generated/user_pb';

// Create a message
const user = create(UserSchema, {
    name: 'John Doe',
    email: 'john@example.com'
});

// Validate the message
const violations = validate(UserSchema, user);

// Handle violations programmatically
if (violations.length === 0) {
    // Valid - proceed with business logic
    processUser(user);
} else {
    // Invalid - handle errors
    violations.forEach(v => {
        console.log(`Field: ${v.fieldPath}`);
        console.log(`Error: ${v.message}`);
    });
}
```

## Validation Options Used

The example proto files demonstrate these Spine validation options:

- `(required)` - Field must have a non-default value.
- `(pattern)` - String must match a regex pattern.
- `(min)` / `(max)` - Numeric bounds.
- `(range)` - Numeric ranges with bracket notation.
- `(distinct)` - Unique elements in repeated fields.
- `(validate)` - Nested message validation.
- `(goes)` - Field dependency constraints.
- `(required_field)` - Message-level field combinations.

## Learn More

For complete documentation:

- **[Validation Library README](../spine-validation-ts/README.md)** - Full API documentation.
- **[Root README](../../README.md)** - Project overview and setup.
- **[Spine Event Engine](https://spine.io/)** - Server-side validation framework.

## Adding Your Own Validation

1. Create a `.proto` file in the `proto/` directory.
2. Import `spine/options.proto`.
3. Add validation options to your message fields.
4. Run `npm run generate` to generate TypeScript code.
5. Use the generated schemas in your code.

Example:

```protobuf
syntax = "proto3";

import "spine/options.proto";

message Order {
    string order_id = 1 [
        (required) = true,
        (pattern).regex = "^ORD-[0-9]{6}$"
    ];

    double total = 2 [
        (min).value = "0.01"
    ];
}
```

## License

Apache License 2.0.
