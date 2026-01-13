# Guide: Accessing Message and Field Descriptors in @bufbuild/protobuf v2

This guide explains how to access message descriptors, field descriptors, and their custom extension options in `@bufbuild/protobuf` v2 (protoc-gen-es v2).

## Overview

When protoc-gen-es v2 generates TypeScript code from `.proto` files, it creates:
- **Schema objects** (e.g., `UserSchema`) that are message descriptors of type `GenMessage<T>`
- These schemas provide access to message metadata, field descriptors, and custom options

## Key Concepts

### 1. Schema Structure

```typescript
import { UserSchema } from './generated/examples/user_pb';

// UserSchema IS the message descriptor (DescMessage)
// It has the following key properties:
UserSchema.kind          // "message"
UserSchema.typeName      // "example.User"
UserSchema.name          // "User"
UserSchema.fields        // Array of field descriptors
UserSchema.field         // Record of fields by localName
UserSchema.proto         // The raw DescriptorProto with options
```

### 2. Field Descriptors

```typescript
// Access field descriptors from the schema
const field = UserSchema.fields.find(f => f.name === 'email');

// Field descriptor properties:
field.name              // Field name in proto
field.localName         // Field name in TypeScript (camelCase)
field.number            // Field number
field.fieldKind         // "scalar" | "message" | "enum" | "list" | "map"
field.proto             // The raw FieldDescriptorProto with options
```

## Accessing Custom Extension Options

There are TWO approaches to access custom field options (like Spine validation options):

### Approach 1: Using `hasOption` / `getOption` (RECOMMENDED)

This is the cleanest approach. These helper functions work directly with descriptors.

```typescript
import { hasOption, getOption } from '@bufbuild/protobuf';
import { UserSchema } from './generated/examples/user_pb';
import { required, pattern, min, required_field } from './generated/options_pb';

// Access message-level options
if (hasOption(UserSchema, required_field)) {
  const value = getOption(UserSchema, required_field);
  console.log('Message required_field:', value);  // "id | email"
}

// Access field-level options
const emailField = UserSchema.fields.find(f => f.name === 'email');
if (emailField) {
  if (hasOption(emailField, required)) {
    const isRequired = getOption(emailField, required);
    console.log('Email is required:', isRequired);  // true
  }

  if (hasOption(emailField, pattern)) {
    const patternOpt = getOption(emailField, pattern);
    console.log('Email pattern:', patternOpt.regex);
    console.log('Email error msg:', patternOpt.errorMsg);
  }
}
```

### Approach 2: Using `hasExtension` / `getExtension` with `proto.options`

This lower-level approach accesses the options from the raw protobuf descriptors.

```typescript
import { hasExtension, getExtension } from '@bufbuild/protobuf';
import { UserSchema } from './generated/examples/user_pb';
import { required, pattern, required_field } from './generated/options_pb';

// Access message-level options via proto.options
const messageOptions = UserSchema.proto.options;
if (messageOptions && hasExtension(messageOptions, required_field)) {
  const value = getExtension(messageOptions, required_field);
  console.log('Message required_field:', value);
}

// Access field-level options via field.proto.options
const emailField = UserSchema.fields.find(f => f.name === 'email');
if (emailField?.proto.options) {
  const fieldOpts = emailField.proto.options;

  if (hasExtension(fieldOpts, required)) {
    const isRequired = getExtension(fieldOpts, required);
    console.log('Email is required:', isRequired);
  }

  if (hasExtension(fieldOpts, pattern)) {
    const patternOpt = getExtension(fieldOpts, pattern);
    console.log('Email pattern:', patternOpt.regex);
  }
}
```

## Complete Working Example

```typescript
import { UserSchema } from './generated/examples/user_pb';
import {
  required,
  min,
  max,
  pattern,
  validate,
  set_once,
  distinct,
  if_missing,
  if_invalid,
  required_field
} from './generated/options_pb';
import { hasOption, getOption } from '@bufbuild/protobuf';

// 1. Access message-level options
console.log('=== Message Options ===');
if (hasOption(UserSchema, required_field)) {
  const value = getOption(UserSchema, required_field);
  console.log(`required_field: "${value}"`);  // "id | email"
}

// 2. Iterate through all fields and their options
console.log('\n=== Field Options ===');
for (const field of UserSchema.fields) {
  console.log(`\nField: ${field.name}`);

  if (hasOption(field, required)) {
    console.log(`  required: ${getOption(field, required)}`);
  }

  if (hasOption(field, set_once)) {
    console.log(`  set_once: ${getOption(field, set_once)}`);
  }

  if (hasOption(field, distinct)) {
    console.log(`  distinct: ${getOption(field, distinct)}`);
  }

  if (hasOption(field, min)) {
    const minOpt = getOption(field, min);
    console.log(`  min.value: "${minOpt.value}"`);
    console.log(`  min.exclusive: ${minOpt.exclusive}`);
    if (minOpt.errorMsg) {
      console.log(`  min.errorMsg: "${minOpt.errorMsg}"`);
    }
  }

  if (hasOption(field, max)) {
    const maxOpt = getOption(field, max);
    console.log(`  max.value: "${maxOpt.value}"`);
    console.log(`  max.exclusive: ${maxOpt.exclusive}`);
    if (maxOpt.errorMsg) {
      console.log(`  max.errorMsg: "${maxOpt.errorMsg}"`);
    }
  }

  if (hasOption(field, pattern)) {
    const patternOpt = getOption(field, pattern);
    console.log(`  pattern.regex: "${patternOpt.regex}"`);
    console.log(`  pattern.errorMsg: "${patternOpt.errorMsg}"`);
  }

  if (hasOption(field, validate)) {
    console.log(`  validate: ${getOption(field, validate)}`);
  }

  if (hasOption(field, if_missing)) {
    const ifMissingOpt = getOption(field, if_missing);
    console.log(`  if_missing.errorMsg: "${ifMissingOpt.errorMsg}"`);
  }

  if (hasOption(field, if_invalid)) {
    const ifInvalidOpt = getOption(field, if_invalid);
    console.log(`  if_invalid.errorMsg: "${ifInvalidOpt.errorMsg}"`);
  }
}
```

## Utility Function: Extract All Field Options

Here's a reusable utility function to extract all validation options from a field:

```typescript
interface FieldValidationOptions {
  required?: boolean;
  set_once?: boolean;
  distinct?: boolean;
  validate?: boolean;
  min?: { value: string; exclusive: boolean; errorMsg: string };
  max?: { value: string; exclusive: boolean; errorMsg: string };
  pattern?: { regex: string; errorMsg: string };
  if_missing?: { errorMsg: string };
  if_invalid?: { errorMsg: string };
}

function getFieldValidationOptions(
  schema: GenMessage<any>,
  fieldName: string
): FieldValidationOptions | null {
  const field = schema.fields.find(f => f.name === fieldName);
  if (!field) return null;

  const options: FieldValidationOptions = {};

  if (hasOption(field, required)) {
    options.required = getOption(field, required);
  }

  if (hasOption(field, set_once)) {
    options.set_once = getOption(field, set_once);
  }

  if (hasOption(field, distinct)) {
    options.distinct = getOption(field, distinct);
  }

  if (hasOption(field, validate)) {
    options.validate = getOption(field, validate);
  }

  if (hasOption(field, min)) {
    const minOpt = getOption(field, min);
    options.min = {
      value: minOpt.value,
      exclusive: minOpt.exclusive,
      errorMsg: minOpt.errorMsg
    };
  }

  if (hasOption(field, max)) {
    const maxOpt = getOption(field, max);
    options.max = {
      value: maxOpt.value,
      exclusive: maxOpt.excessive,
      errorMsg: maxOpt.errorMsg
    };
  }

  if (hasOption(field, pattern)) {
    const patOpt = getOption(field, pattern);
    options.pattern = {
      regex: patOpt.regex,
      errorMsg: patOpt.errorMsg
    };
  }

  if (hasOption(field, if_missing)) {
    const ifMissingOpt = getOption(field, if_missing);
    options.if_missing = {
      errorMsg: ifMissingOpt.errorMsg
    };
  }

  if (hasOption(field, if_invalid)) {
    const ifInvalidOpt = getOption(field, if_invalid);
    options.if_invalid = {
      errorMsg: ifInvalidOpt.errorMsg
    };
  }

  return Object.keys(options).length > 0 ? options : null;
}

// Usage:
const emailOptions = getFieldValidationOptions(UserSchema, 'email');
console.log(JSON.stringify(emailOptions, null, 2));
```

## TypeScript Types

```typescript
import type { GenMessage, DescMessage, DescField, DescExtension } from '@bufbuild/protobuf/codegenv2';
import type { MessageOptions, FieldOptions } from '@bufbuild/protobuf/wkt';

// Schema is a GenMessage<T> which extends DescMessage
const schema: GenMessage<User> = UserSchema;

// Access the descriptor properties
const messageDescriptor: DescMessage = UserSchema;

// Field descriptors
const fieldDescriptor: DescField = UserSchema.fields[0];

// Extension descriptors (for custom options)
const requiredExt: GenExtension<FieldOptions, boolean> = required;
const patternExt: GenExtension<FieldOptions, PatternOption> = pattern;
```

## Important Notes

1. **Schema IS the descriptor**: In v2, `UserSchema` is the message descriptor itself. Don't look for `UserSchema.message` - that doesn't exist.

2. **Use `hasOption`/`getOption` for cleaner code**: These functions handle the descriptor types correctly and are the recommended approach.

3. **Access field options via descriptor, not proto**: While you can access `field.proto.options`, using `hasOption(field, extension)` is cleaner.

4. **Field names**: Use `field.name` for the proto name, `field.localName` for the TypeScript property name.

5. **Type safety**: Extension functions are fully type-safe. The return type matches the extension value type.

## Common Patterns

### Pattern 1: Validate a message based on its field options

```typescript
function validateMessage(schema: GenMessage<any>, data: any): string[] {
  const errors: string[] = [];

  for (const field of schema.fields) {
    const value = data[field.localName];

    // Check required
    if (hasOption(field, required) && getOption(field, required)) {
      if (value === undefined || value === null || value === '') {
        errors.push(`Field ${field.name} is required`);
      }
    }

    // Check pattern
    if (hasOption(field, pattern) && typeof value === 'string') {
      const patternOpt = getOption(field, pattern);
      const regex = new RegExp(patternOpt.regex);
      if (!regex.test(value)) {
        errors.push(patternOpt.errorMsg || `Field ${field.name} does not match pattern`);
      }
    }

    // Check min for numbers
    if (hasOption(field, min) && typeof value === 'number') {
      const minOpt = getOption(field, min);
      const minValue = parseFloat(minOpt.value);
      if (minOpt.exclusive ? value <= minValue : value < minValue) {
        errors.push(minOpt.errorMsg || `Field ${field.name} is below minimum`);
      }
    }
  }

  return errors;
}
```

### Pattern 2: Generate validation schema for another library

```typescript
function toZodSchema(schema: GenMessage<any>) {
  const fields: Record<string, any> = {};

  for (const field of schema.fields) {
    let fieldSchema;

    if (field.fieldKind === 'scalar' && field.scalar === ScalarType.STRING) {
      fieldSchema = z.string();

      if (hasOption(field, pattern)) {
        const patternOpt = getOption(field, pattern);
        fieldSchema = fieldSchema.regex(new RegExp(patternOpt.regex), {
          message: patternOpt.errorMsg
        });
      }
    } else if (field.fieldKind === 'scalar' && field.scalar === ScalarType.INT32) {
      fieldSchema = z.number().int();

      if (hasOption(field, min)) {
        const minOpt = getOption(field, min);
        const minValue = parseInt(minOpt.value);
        fieldSchema = minOpt.exclusive
          ? fieldSchema.gt(minValue)
          : fieldSchema.gte(minValue);
      }
    }

    if (hasOption(field, required) && getOption(field, required)) {
      // Field is required (already the default in Zod)
    } else {
      fieldSchema = fieldSchema.optional();
    }

    fields[field.localName] = fieldSchema;
  }

  return z.object(fields);
}
```

## Available Spine Validation Extensions

From `/Users/armiol/development/Spine/validation-ts/src/generated/options_pb.ts`:

### Field Options:
- `required: GenExtension<FieldOptions, boolean>` - Field is required
- `if_missing: GenExtension<FieldOptions, IfMissingOption>` - Custom error for missing field
- `min: GenExtension<FieldOptions, MinOption>` - Minimum value constraint
- `max: GenExtension<FieldOptions, MaxOption>` - Maximum value constraint
- `pattern: GenExtension<FieldOptions, PatternOption>` - Regex pattern constraint
- `validate: GenExtension<FieldOptions, boolean>` - Enable validation for nested messages
- `if_invalid: GenExtension<FieldOptions, IfInvalidOption>` - Custom error for invalid field
- `goes: GenExtension<FieldOptions, GoesOption>` - Field dependency
- `set_once: GenExtension<FieldOptions, boolean>` - Field can only be set once
- `distinct: GenExtension<FieldOptions, boolean>` - Repeated field must have unique values
- `range: GenExtension<FieldOptions, string>` - Range constraint for numbers

### Message Options:
- `required_field: GenExtension<MessageOptions, string>` - Required field combinations
- `entity: GenExtension<MessageOptions, EntityOption>` - Entity metadata

### Oneof Options:
- `is_required: GenExtension<OneofOptions, boolean>` - Oneof group must have one field set

## References

- **Generated files**: `/Users/armiol/development/Spine/validation-ts/src/generated/`
  - `examples/user_pb.ts` - Example generated code with schemas
  - `options_pb.ts` - Spine validation extension definitions

- **@bufbuild/protobuf documentation**: https://github.com/bufbuild/protobuf-es

- **Protobuf descriptor documentation**: https://protobuf.dev/reference/protobuf/google.protobuf/
