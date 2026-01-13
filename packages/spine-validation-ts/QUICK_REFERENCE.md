# Quick Reference: Accessing Descriptors and Field Options in @bufbuild/protobuf v2

## TL;DR

```typescript
import { hasOption, getOption } from '@bufbuild/protobuf';
import { UserSchema } from './generated/examples/user_pb';
import { required, pattern, min } from './generated/options_pb';

// Access message options
const msgRequiredFields = getOption(UserSchema, required_field);

// Access field and its options
const emailField = UserSchema.fields.find(f => f.name === 'email');
if (hasOption(emailField, required)) {
  const isRequired = getOption(emailField, required);  // true
}
if (hasOption(emailField, pattern)) {
  const { regex, errorMsg } = getOption(emailField, pattern);
}
```

## Key Points

1. **Schema IS the descriptor**: `UserSchema` directly provides descriptor properties
2. **Use `hasOption`/`getOption`**: Cleanest API for accessing custom options
3. **Iterate fields**: `schema.fields` gives you all field descriptors
4. **Type-safe**: All extension accesses are fully typed

## Common Operations

### Get a field descriptor
```typescript
// By name
const field = UserSchema.fields.find(f => f.name === 'email');

// By localName (TypeScript property name)
const field = UserSchema.field['email'];  // Using record accessor

// All fields
for (const field of UserSchema.fields) {
  console.log(field.name, field.fieldKind);
}
```

### Check if field has an option
```typescript
if (hasOption(field, required)) {
  // Field has the required option
}
```

### Get option value
```typescript
// Simple boolean option
const isRequired = getOption(field, required);

// Complex option (returns message type)
const patternOpt = getOption(field, pattern);
console.log(patternOpt.regex);
console.log(patternOpt.errorMsg);

const minOpt = getOption(field, min);
console.log(minOpt.value);          // "1"
console.log(minOpt.exclusive);       // false
console.log(minOpt.errorMsg);        // custom error message
```

### Get message-level options
```typescript
import { required_field } from './generated/options_pb';

if (hasOption(UserSchema, required_field)) {
  const value = getOption(UserSchema, required_field);
  console.log(value);  // "id | email"
}
```

## Field Descriptor Properties

```typescript
const field = UserSchema.fields[0];

field.name              // "email" (proto name)
field.localName         // "email" (TypeScript property name)
field.number            // 3 (field number)
field.fieldKind         // "scalar" | "message" | "enum" | "list" | "map"
field.jsonName          // "email" (JSON field name)

// For scalar fields:
field.scalar            // ScalarType.STRING, ScalarType.INT32, etc.

// For message fields:
field.message           // Message descriptor (DescMessage)

// For enum fields:
field.enum              // Enum descriptor (DescEnum)
```

## Message Descriptor Properties

```typescript
UserSchema.kind          // "message"
UserSchema.typeName      // "example.User"
UserSchema.name          // "User"
UserSchema.fields        // Array<DescField>
UserSchema.field         // Record<string, DescField> - by localName
UserSchema.oneofs        // Array<DescOneof>
UserSchema.proto         // DescriptorProto (raw protobuf descriptor)
```

## All Available Spine Validation Extensions

### Field-level
```typescript
import {
  required,        // boolean
  set_once,        // boolean
  distinct,        // boolean (for repeated fields)
  validate,        // boolean (for message fields)
  min,             // MinOption { value, exclusive, errorMsg }
  max,             // MaxOption { value, exclusive, errorMsg }
  pattern,         // PatternOption { regex, errorMsg, modifier }
  range,           // string
  if_missing,      // IfMissingOption { errorMsg }
  if_invalid,      // IfInvalidOption { errorMsg }
  goes,            // GoesOption { with, errorMsg }
} from './generated/options_pb';
```

### Message-level
```typescript
import {
  required_field,  // string (e.g., "id | email")
  entity,          // EntityOption { kind, visibility }
} from './generated/options_pb';
```

### Oneof-level
```typescript
import {
  is_required,     // boolean
} from './generated/options_pb';
```

## Complete Example

```typescript
import { hasOption, getOption } from '@bufbuild/protobuf';
import { UserSchema } from './generated/examples/user_pb';
import { required, pattern, min, set_once, distinct } from './generated/options_pb';

// Check all fields for validation options
for (const field of UserSchema.fields) {
  console.log(`\nField: ${field.name} (${field.fieldKind})`);

  if (hasOption(field, required)) {
    console.log(`  ✓ Required: ${getOption(field, required)}`);
  }

  if (hasOption(field, set_once)) {
    console.log(`  ✓ Set once: ${getOption(field, set_once)}`);
  }

  if (hasOption(field, distinct)) {
    console.log(`  ✓ Distinct: ${getOption(field, distinct)}`);
  }

  if (hasOption(field, min)) {
    const { value, exclusive, errorMsg } = getOption(field, min);
    console.log(`  ✓ Min: ${value} (exclusive: ${exclusive})`);
  }

  if (hasOption(field, pattern)) {
    const { regex, errorMsg } = getOption(field, pattern);
    console.log(`  ✓ Pattern: ${regex}`);
    if (errorMsg) console.log(`     Error: ${errorMsg}`);
  }
}
```

## Alternative: Using `hasExtension`/`getExtension`

If you need the lower-level API:

```typescript
import { hasExtension, getExtension } from '@bufbuild/protobuf';

// For message options
const msgOptions = UserSchema.proto.options;
if (msgOptions && hasExtension(msgOptions, required_field)) {
  const value = getExtension(msgOptions, required_field);
}

// For field options
const fieldOptions = emailField.proto.options;
if (fieldOptions && hasExtension(fieldOptions, required)) {
  const value = getExtension(fieldOptions, required);
}
```

**Note**: `hasOption`/`getOption` is recommended as it's cleaner and works directly with descriptors.
