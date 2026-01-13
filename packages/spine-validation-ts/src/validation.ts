/**
 * Validation module for Protobuf messages with Spine validation options.
 *
 * This module provides the main validation API and utility functions
 * for validating Protobuf messages against Spine validation constraints.
 */

import type { Message } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';

import type { ConstraintViolation } from './generated/spine/validate/validation_error_pb';
import type { TemplateString } from './generated/spine/validate/error_message_pb';

import { validateRequiredFields } from './options/required';
import { validatePatternFields } from './options/pattern';
import { validateRequiredFieldOption } from './options/required-field';
import { validateMinMaxFields } from './options/min-max';
import { validateRangeFields } from './options/range';
import { validateDistinctFields } from './options/distinct';
import { validateNestedFields } from './options/validate';
import { validateGoesFields } from './options/goes';

export type { ConstraintViolation, ValidationError } from './generated/spine/validate/validation_error_pb';
export type { TemplateString } from './generated/spine/validate/error_message_pb';
export type { FieldPath } from './generated/spine/base/field_path_pb';

/**
 * Validates a message against its Spine validation constraints.
 *
 * This function applies all registered validation rules to the given message
 * and returns an array of constraint violations. An empty array indicates
 * the message is valid.
 *
 * Currently supported validation options:
 * - `(required)` - ensures field has a non-default value
 * - `(pattern)` - validates string fields against regular expressions
 * - `(required_field)` - requires specific combinations of fields at message level
 * - `(min)` / `(max)` - numeric range validation with inclusive/exclusive bounds
 * - `(range)` - bounded numeric ranges using bracket notation for inclusive/exclusive bounds
 * - `(distinct)` - ensures all elements in repeated fields are unique
 * - `(validate)` - enables recursive validation of nested message fields
 * - `(goes)` - enforces field dependency (field can only be set if another field is set)
 *
 * @param schema The message schema containing validation metadata.
 * @param message The message instance to validate.
 * @returns Array of constraint violations (empty if valid).
 *
 * @example
 * ```typescript
 * import { validate } from 'spine-validation-ts';
 * import { UserSchema } from './generated/user_pb';
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
export function validate<T extends Message>(
    schema: GenMessage<T>,
    message: any
): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    validateRequiredFields(schema, message, violations);
    validatePatternFields(schema, message, violations);
    validateRequiredFieldOption(schema, message, violations);
    validateMinMaxFields(schema, message, violations);
    validateRangeFields(schema, message, violations);
    validateDistinctFields(schema, message, violations);
    validateNestedFields(schema, message, violations);
    validateGoesFields(schema, message, violations);

    return violations;
}

/**
 * Formats a `TemplateString` by replacing all placeholders with their values.
 *
 * Placeholders in the format `${key}` are replaced with corresponding values
 * from the `placeholderValue` map.
 *
 * @param template The template string with placeholders.
 * @returns Formatted string with placeholders replaced.
 *
 * @example
 * ```typescript
 * const template = {
 *     withPlaceholders: 'Field ${field} has invalid value: ${value}',
 *     placeholderValue: { field: 'email', value: 'invalid@' }
 * };
 * const result = formatTemplateString(template);
 * // Result: "Field email has invalid value: invalid@"
 * ```
 */
export function formatTemplateString(template: TemplateString): string {
    let result = template.withPlaceholders;
    for (const [key, value] of Object.entries(template.placeholderValue)) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    return result;
}

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
 * const user = create(UserSchema, { name: '', email: '' });
 * const violations = validate(UserSchema, user);
 * console.log(formatViolations(violations));
 * // Output:
 * // 1. example.User.name: A value must be set.
 * // 2. example.User.email: A value must be set.
 * ```
 */
export function formatViolations(violations: ConstraintViolation[]): string {
    if (violations.length === 0) {
        return 'No violations';
    }

    return violations.map((v, index) => {
        const fieldPath = v.fieldPath?.fieldName.join('.') || 'unknown';
        const message = v.message ? formatTemplateString(v.message) : 'Validation failed';
        return `${index + 1}. ${v.typeName}.${fieldPath}: ${message}`;
    }).join('\n');
}
