/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Redistribution and use in source and/or binary forms, with or without
 * modification, must retain the above copyright notice and the following
 * disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Validation module for Protobuf messages with Spine validation options.
 *
 * This module provides the main validation API and utility functions
 * for validating Protobuf messages against Spine validation constraints.
 */

import { createRegistry } from "@bufbuild/protobuf";
import type { DescFile, DescMessage, MessageShape, Registry } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "./generated/spine/validate/validation_error_pb.js";
import type { TemplateString } from "./generated/spine/validate/error_message_pb.js";

import { Required } from "./options/required.js";
import { validatePatternFields } from "./options/pattern.js";
import { Require } from "./options/required-field.js";
import { MinMax } from "./options/min-max.js";
import { Range } from "./options/range.js";
import { validateWhenField } from "./options/when.js";
import { validateDistinctField } from "./options/distinct.js";
import { validateNestedField } from "./options/validate.js";
import { Goes } from "./options/goes.js";
import { Choice } from "./options/choice.js";
import { ValidationOrchestration, type FieldValidator } from "./orchestration.js";
import { ValidationContext } from "./validation-contract.js";

const fieldValidators: readonly FieldValidator[] = [
  {
    validate(context, schema, message, field, violations) {
      Required.validate(context, schema, message, field, violations);
    },
  },
  ValidationOrchestration.legacyFieldValidator(validatePatternFields),
  {
    validate(context, schema, message, field, violations) {
      MinMax.validate(context, schema, message, field, violations);
    },
  },
  {
    validate(context, schema, message, field, violations) {
      Range.validate(context, schema, message, field, violations);
    },
  },
  {
    validate(context, schema, message, field, violations) {
      validateWhenField(context, schema, message, field, violations);
    },
  },
  {
    validate(context, schema, message, field, violations) {
      validateDistinctField(context, schema, message, field, violations);
    },
  },
  {
    validate(context, schema, message, field, violations, registry) {
      validateNestedField(
        context,
        schema,
        message,
        field,
        violations,
        registry,
        ValidationEngine.validateInternal,
      );
    },
  },
  {
    validate(context, schema, message, field, violations) {
      Goes.validate(context, schema, message, field, violations);
    },
  },
];

export type {
  ConstraintViolation,
  ValidationError,
} from "./generated/spine/validate/validation_error_pb.js";
export type { TemplateString } from "./generated/spine/validate/error_message_pb.js";
export type { FieldPath } from "./generated/spine/base/field_path_pb.js";

/**
 * Validates a message against its Spine validation constraints.
 *
 * This function applies all registered validation rules to the given message
 * and returns an array of constraint violations. An empty array indicates
 * the message is valid.
 *
 * Traversal follows declaration order and the internal validator order, but
 * callers must not treat that order as a public compatibility guarantee.
 *
 * Shared-envelope validators retain the root entry type, a complete path of
 * Proto field names, and a descriptor-packed offending value when one exists.
 * Their diagnostic is always present; an option without a custom or default
 * message produces an empty template string. `(pattern)` is the documented
 * legacy exception; see [the pattern section](../../../docs/validation-contract.md#implemented-options).
 *
 * Currently supported validation options:
 * - `(required)` — validates supported presence targets
 * - `(pattern)` — validates string fields against regular expressions
 * - `(require)` — requires specific combinations of fields at message level
 * - `(min)` / `(max)` — numeric range validation with inclusive/exclusive bounds
 * - `(range)` — bounded numeric ranges using bracket notation for inclusive/exclusive bounds
 * - `(when)` — verifies supported timestamps and Spine temporal values are in the past or future
 * - `(distinct)` — emits one violation for each duplicated Buf-equality class
 * - `(validate)` — returns only leaf violations from nested values and known `Any` payloads
 * - `(goes)` — enforces field dependency (field can only be set if another field is set)
 * - `(choice)` — requires that a `oneof` group has at least one field set
 *
 * @param schema The message schema containing validation metadata.
 * @param message The message instance to validate.
 * @returns Array of constraint violations (empty if valid).
 *
 * @example
 * ```typescript
 * import { formatViolations, validate } from '@spine-event-engine/validation';
 * import { UserSchema } from './generated/user_pb.js';
 * import { create } from '@bufbuild/protobuf';
 *
 * const user = create(UserSchema, { name: '', email: '' });
 * const violations = validate(UserSchema, user);
 *
 * if (violations.length > 0) {
 *     console.log('Validation failed:', formatViolations(violations));
 * }
 * ```
 */
export function validate<S extends DescMessage>(
  schema: S,
  message: NoInfer<MessageShape<S>>,
): ConstraintViolation[] {
  return ValidationEngine.validateInternal(
    schema,
    message,
    ValidationContext.create(schema),
    ValidationEngine.createRootRegistry(schema),
  );
}

/** Coordinates internal traversal while preserving context and registry state. */
const ValidationEngine = {
  validateInternal<S extends DescMessage>(
    schema: S,
    message: MessageShape<S>,
    context: ValidationContext,
    registry: Registry,
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    Require.validate(context, schema, message, violations);

    for (const field of schema.fields) {
      for (const validator of fieldValidators) {
        validator.validate(context, schema, message, field, violations, registry);
      }
    }

    Choice.validate(context, schema, message, violations);

    return violations;
  },

  createRootRegistry(schema: DescMessage): Registry {
    return createRegistry(...ValidationEngine.dependencyClosure(schema.file));
  },

  dependencyClosure(root: DescFile): DescFile[] {
    const files: DescFile[] = [];
    const visited = new Set<string>();
    const visit = (file: DescFile): void => {
      if (visited.has(file.name)) return;
      visited.add(file.name);
      files.push(file);
      for (const dependency of file.dependencies) visit(dependency);
    };
    visit(root);
    return files;
  },
} as const;

/**
 * Formats a `TemplateString` by replacing all placeholders with their values.
 *
 * Placeholders in the format `${key}` are replaced with corresponding values
 * from the `placeholderValue` map.
 *
 * @param template The template string with placeholders.
 * @returns Formatted string with placeholders replaced.
 *
 */
const TemplateStrings = {
  format(template: TemplateString): string {
    let result = template.withPlaceholders;
    for (const [key, value] of Object.entries(template.placeholderValue)) {
      result = result.split(`\${${key}}`).join(value);
    }
    return result;
  },
};

/**
 * Formats an array of constraint violations into a human-readable string.
 *
 * Each violation is formatted as: `<index>. <typeName>.<fieldPath>: <message>`
 *
 * @param violations Array of constraint violations to format.
 * @returns Formatted string describing all violations, or "No violations" if empty.
 *
 * @example
 * ```typescript
 * import { create } from '@bufbuild/protobuf';
 * import { formatViolations, validate } from '@spine-event-engine/validation';
 * import { UserSchema } from './generated/user_pb.js';
 *
 * const user = create(UserSchema, { name: '', email: '' });
 * const violations = validate(UserSchema, user);
 * console.log(formatViolations(violations));
 * // Output:
 * // 1. example.User.name: A value must be set.
 * // 2. example.User.email: A value must be set.
 * ```
 */

/**
 * Utility object for working with constraint violations.
 *
 * Provides helper methods to extract formatted information from `ConstraintViolation` objects.
 *
 * @example
 * ```typescript
 * import { create } from '@bufbuild/protobuf';
 * import { validate, Violations } from '@spine-event-engine/validation';
 * import { UserSchema } from './generated/user_pb.js';
 *
 * const user = create(UserSchema, { name: '', email: '' });
 * const violations = validate(UserSchema, user);
 * violations.forEach(v => {
 *     const path = Violations.failurePath(v);
 *     const message = Violations.formatMessage(v);
 *     console.error(`${v.typeName}.${path}: ${message}`);
 * });
 * ```
 */
export const Violations = {
  formatAll(violations: ConstraintViolation[]): string {
    if (violations.length === 0) return "No violations";
    return violations
      .map((violation, index) => {
        const fieldPath = violation.fieldPath?.fieldName.join(".") || "unknown";
        const message = violation.message
          ? TemplateStrings.format(violation.message)
          : "Validation failed";
        return `${index + 1}. ${violation.typeName}.${fieldPath}: ${message}`;
      })
      .join("\n");
  },
  /**
   * Returns the formatted error message from a violation with all placeholders replaced.
   *
   * Namespaced placeholders such as `${field.path}` and `${field.value}` are
   * substituted with their corresponding values from the violation context.
   *
   * @param violation The constraint violation to format.
   * @returns The formatted error message, or 'Validation failed' if no message is present.
   *
   * @example
   * ```typescript
   * import { type ConstraintViolation, Violations } from '@spine-event-engine/validation';
   *
   * declare const violation: ConstraintViolation;
   * const message = Violations.formatMessage(violation);
   * // Returns: "Email must be valid. Provided: `invalid@`."
   * ```
   */
  formatMessage(violation: ConstraintViolation): string {
    return violation.message ? TemplateStrings.format(violation.message) : "Validation failed";
  },

  /**
   * Returns the field path from a violation as a dot-separated string.
   *
   * Converts the field path array (e.g., `['user', 'email']`) into a single
   * dot-separated string (e.g., `'user.email'`).
   *
   * @param violation The constraint violation.
   * @returns The field path as a string, or 'unknown' if no field path is present.
   *
   * @example
   * ```typescript
   * import { type ConstraintViolation, Violations } from '@spine-event-engine/validation';
   *
   * declare const violation: ConstraintViolation;
   * const path = Violations.failurePath(violation);
   * // Returns: "user.email"
   * ```
   */
  failurePath(violation: ConstraintViolation): string {
    return violation.fieldPath?.fieldName.join(".") || "unknown";
  },
} as const;
