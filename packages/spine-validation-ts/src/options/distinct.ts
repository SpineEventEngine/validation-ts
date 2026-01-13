/**
 * Validation logic for the `(distinct)` option.
 *
 * The `(distinct)` option is a field-level constraint that enforces uniqueness
 * of elements in repeated fields.
 *
 * Supported field types:
 * - All repeated scalar types (`int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`,
 *   `fixed32`, `fixed64`, `sfixed32`, `sfixed64`, `float`, `double`, `bool`, `string`, `bytes`)
 * - Repeated enum fields
 *
 * Features:
 * - Ensures all elements in a repeated field are unique.
 * - Detects duplicate values and reports violations with element indices.
 * - Works with primitive types (numbers, strings, booleans).
 * - Works with enum values.
 *
 * Examples:
 * ```protobuf
 * repeated string tags = 1 [(distinct) = true];
 * repeated int32 product_ids = 2 [(distinct) = true];
 * repeated Status statuses = 3 [(distinct) = true];
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation for `(distinct)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName Array representing the field path (including index).
 * @param duplicateValue The duplicate value found.
 * @param firstIndex Index of the first occurrence of the value.
 * @param duplicateIndex Index of the duplicate occurrence.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string[],
    duplicateValue: any,
    firstIndex: number,
    duplicateIndex: number
): ConstraintViolation {
    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: `Duplicate value found in repeated field. Value {value} at index {duplicate_index} is a duplicate of the value at index {first_index}.`,
            placeholderValue: {
                'value': String(duplicateValue),
                'first_index': String(firstIndex),
                'duplicate_index': String(duplicateIndex)
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Checks if two values are considered equal for distinctness purposes.
 *
 * Uses strict equality for primitives (number, string, boolean, bigint).
 *
 * @param val1 The first value to compare.
 * @param val2 The second value to compare.
 * @returns `true` if the values are equal, `false` otherwise.
 */
function valuesAreEqual(val1: any, val2: any): boolean {
    return val1 === val2;
}

/**
 * Validates `(distinct)` constraint for a single field.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance being validated.
 * @param field The field descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateFieldDistinct<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    field: any,
    violations: ConstraintViolation[]
): void {
    const distinctOpt = getRegisteredOption('distinct');

    if (!distinctOpt) {
        return;
    }

    if (field.fieldKind !== 'list') {
        return;
    }

    if (!hasOption(field, distinctOpt)) {
        return;
    }

    const distinctValue = getOption(field, distinctOpt);
    if (distinctValue !== true) {
        return;
    }

    const fieldValue = (message as any)[field.localName];

    if (!Array.isArray(fieldValue) || fieldValue.length <= 1) {
        return;
    }

    const seenValues = new Map<any, number>();

    fieldValue.forEach((element: any, index: number) => {
        let isDuplicate = false;
        let firstIndex = -1;

        for (const [seenValue, seenIndex] of seenValues.entries()) {
            if (valuesAreEqual(element, seenValue)) {
                isDuplicate = true;
                firstIndex = seenIndex;
                break;
            }
        }

        if (isDuplicate) {
            violations.push(createViolation(
                schema.typeName,
                [field.name, String(index)],
                element,
                firstIndex,
                index
            ));
        } else {
            seenValues.set(element, index);
        }
    });
}

/**
 * Validates the `(distinct)` option for all fields in a message.
 *
 * This is a field-level constraint that enforces uniqueness of elements
 * in repeated fields. Only applies to repeated fields (lists).
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateDistinctFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    for (const field of schema.fields) {
        validateFieldDistinct(schema, message, field, violations);
    }
}
