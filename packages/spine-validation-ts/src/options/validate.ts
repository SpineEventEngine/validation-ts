/**
 * Validation logic for the `(validate)` and `(if_invalid)` options.
 *
 * The `(validate)` option is a field-level constraint that enables recursive
 * validation of nested message fields, repeated message fields, and map fields.
 *
 * The `(if_invalid)` option provides custom error messages for validation failures.
 *
 * Supported field types:
 * - Message fields (singular)
 * - Repeated message fields
 * - Map fields (validates each entry)
 *
 * Features:
 * - Recursive validation: validates constraints in nested messages
 * - Custom error messages with token replacement (`{value}`)
 * - Validates each item in repeated fields
 * - Validates each value in map entries
 *
 * Examples:
 * ```protobuf
 * message Address {
 *   string street = 1 [(required) = true];
 * }
 * Address address = 1 [(validate) = true];
 * repeated Product products = 2 [(validate) = true];
 * Customer customer = 3 [(validate) = true, (if_invalid).error_msg = "Invalid customer: {value}."];
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import type { IfInvalidOption } from '../generated/spine/options_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation for nested validation failure.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName Array representing the field path.
 * @param errorMessage The error message describing the violation.
 * @param fieldValue The actual value of the field (optional).
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string[],
    errorMessage: string,
    fieldValue?: any
): ConstraintViolation {
    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: errorMessage,
            placeholderValue: {
                'value': fieldValue ? String(fieldValue) : ''
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Gets the error message from `(if_invalid)` option or returns default.
 *
 * @param ifInvalidOption The `(if_invalid)` option object.
 * @returns The custom error message or a default message.
 */
function getErrorMessage(ifInvalidOption: IfInvalidOption | undefined): string {
    if (ifInvalidOption && ifInvalidOption.errorMsg) {
        return ifInvalidOption.errorMsg;
    }
    return 'Nested message validation failed.';
}

/**
 * Validates a single message field by recursively calling validate on it.
 *
 * @param parentTypeName The fully qualified parent message type name.
 * @param fieldPath Array representing the field path from parent.
 * @param nestedMessage The nested message instance to validate.
 * @param nestedSchema The schema of the nested message.
 * @param ifInvalidOption The `(if_invalid)` option if present.
 * @param violations Array to collect constraint violations.
 */
function validateNestedMessage(
    parentTypeName: string,
    fieldPath: string[],
    nestedMessage: any,
    nestedSchema: GenMessage<any>,
    ifInvalidOption: IfInvalidOption | undefined,
    violations: ConstraintViolation[]
): void {
    const { validate } = require('../validation');

    const nestedViolations = validate(nestedSchema, nestedMessage);

    if (nestedViolations.length > 0) {
        const errorMessage = getErrorMessage(ifInvalidOption);

        violations.push(createViolation(
            parentTypeName,
            fieldPath,
            errorMessage,
            nestedMessage
        ));

        for (const nestedViolation of nestedViolations) {
            const adjustedViolation = create(ConstraintViolationSchema, {
                typeName: nestedViolation.typeName,
                fieldPath: create(FieldPathSchema, {
                    fieldName: [...fieldPath, ...(nestedViolation.fieldPath?.fieldName || [])]
                }),
                fieldValue: nestedViolation.fieldValue,
                message: nestedViolation.message,
                msgFormat: nestedViolation.msgFormat,
                param: nestedViolation.param,
                violation: nestedViolation.violation
            });
            violations.push(adjustedViolation);
        }
    }
}

/**
 * Validates `(validate)` constraint for a single field.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance being validated.
 * @param field The field descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateFieldValidate<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    field: any,
    violations: ConstraintViolation[]
): void {
    const validateOpt = getRegisteredOption('validate');
    const ifInvalidOpt = getRegisteredOption('if_invalid');

    if (!validateOpt) {
        return;
    }

    if (!hasOption(field, validateOpt)) {
        return;
    }

    const validateValue = getOption(field, validateOpt);
    if (validateValue !== true) {
        return;
    }

    const ifInvalidOption = ifInvalidOpt && hasOption(field, ifInvalidOpt)
        ? getOption(field, ifInvalidOpt) as IfInvalidOption
        : undefined;

    const fieldValue = (message as any)[field.localName];

    if (field.fieldKind === 'message') {
        if (!fieldValue) {
            return;
        }

        const nestedSchema = field.message;
        if (!nestedSchema) {
            return;
        }

        validateNestedMessage(
            schema.typeName,
            [field.name],
            fieldValue,
            nestedSchema,
            ifInvalidOption,
            violations
        );
    } else if (field.fieldKind === 'list') {
        if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
            return;
        }

        if (field.listKind !== 'message' || !field.message) {
            return;
        }

        const nestedSchema = field.message;

        fieldValue.forEach((element: any, index: number) => {
            if (element) {
                validateNestedMessage(
                    schema.typeName,
                    [field.name, String(index)],
                    element,
                    nestedSchema,
                    ifInvalidOption,
                    violations
                );
            }
        });
    } else if (field.fieldKind === 'map') {
        if (!fieldValue || Object.keys(fieldValue).length === 0) {
            return;
        }

        if (!field.mapValue || field.mapKind !== 'message' || !field.message) {
            return;
        }

        const nestedSchema = field.message;

        for (const [key, value] of Object.entries(fieldValue)) {
            if (value) {
                validateNestedMessage(
                    schema.typeName,
                    [field.name, key],
                    value,
                    nestedSchema,
                    ifInvalidOption,
                    violations
                );
            }
        }
    }
}

/**
 * Validates the `(validate)` and `(if_invalid)` options for all fields in a message.
 *
 * This enables recursive validation of nested message fields. When `(validate) = true`
 * is set on a message field, the validation framework will recursively validate
 * all constraints defined in that nested message.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateNestedFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    for (const field of schema.fields) {
        validateFieldValidate(schema, message, field, violations);
    }
}
