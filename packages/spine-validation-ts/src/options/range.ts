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
 * Validation logic for the `(range)` option.
 *
 * The `(range)` option is a field-level constraint that enforces bounded numeric ranges
 * using bracket notation for inclusive/exclusive bounds.
 *
 * Supported field types:
 * - `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`
 * - `fixed32`, `fixed64`, `sfixed32`, `sfixed64`
 * - `float`, `double`
 *
 * Features:
 * - Inclusive bounds (closed intervals): `[min..max]`
 * - Exclusive bounds (open intervals): `(min..max)`
 * - Half-open intervals: `[min..max)` or `(min..max]`
 * - Validation applies to repeated fields (each element checked independently)
 *
 * Syntax:
 * - `"[0..100]"` → 0 <= value <= 100
 * - `"(0..100)"` → 0 < value < 100
 * - `"[0..100)"` → 0 <= value < 100
 * - `"(0..100]"` → 0 < value <= 100
 *
 * Examples:
 * ```protobuf
 * int32 rgb_value = 1 [(range) = "[0..255]"];  // RGB color value
 * int32 hour = 2 [(range) = "[0..24)"];  // Hour (0-23)
 * double percentage = 3 [(range) = "(0.0..1.0)"];  // Exclusive percentage
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create, ScalarType } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Represents a parsed range with bounds and inclusivity flags.
 */
interface ParsedRange {
    min: number;
    max: number;
    minInclusive: boolean;
    maxInclusive: boolean;
}

/**
 * Creates a constraint violation for `(range)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName Array representing the field path.
 * @param fieldValue The actual value of the field.
 * @param rangeStr The range string that was violated.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string[],
    fieldValue: any,
    rangeStr: string
): ConstraintViolation {
    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: `The number must be in range ${rangeStr}.`,
            placeholderValue: {
                'value': String(fieldValue),
                'range': rangeStr
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Checks if a scalar type is numeric.
 *
 * @param scalarType The scalar type to check.
 * @returns `true` if the type is numeric, `false` otherwise.
 */
function isNumericType(scalarType: ScalarType): boolean {
    return scalarType !== ScalarType.STRING &&
           scalarType !== ScalarType.BYTES &&
           scalarType !== ScalarType.BOOL;
}

/**
 * Parses a range string like `"[0..100]"` into a ParsedRange object.
 *
 * Syntax:
 * - `[` or `]` = inclusive bound
 * - `(` or `)` = exclusive bound
 * - `..` = separator between min and max
 *
 * @param rangeStr The range string from the proto option.
 * @param scalarType The field's scalar type for parsing numbers.
 * @returns ParsedRange object or `null` if parsing fails.
 */
function parseRange(rangeStr: string, scalarType: ScalarType): ParsedRange | null {
    const trimmed = rangeStr.trim();

    if (trimmed.length < 5) {
        console.warn(`Invalid range format (too short): "${rangeStr}"`);
        return null;
    }

    const firstChar = trimmed[0];
    const lastChar = trimmed[trimmed.length - 1];

    if (!['[', '('].includes(firstChar) || ![')',']'].includes(lastChar)) {
        console.warn(`Invalid range format (missing brackets): "${rangeStr}"`);
        return null;
    }

    const minInclusive = firstChar === '[';
    const maxInclusive = lastChar === ']';

    const middle = trimmed.substring(1, trimmed.length - 1);

    const parts = middle.split('..');
    if (parts.length !== 2) {
        console.warn(`Invalid range format (missing .. separator): "${rangeStr}"`);
        return null;
    }

    const [minStr, maxStr] = parts;

    let min: number;
    let max: number;

    if (scalarType === ScalarType.FLOAT || scalarType === ScalarType.DOUBLE) {
        min = parseFloat(minStr);
        max = parseFloat(maxStr);
    } else {
        min = parseInt(minStr, 10);
        max = parseInt(maxStr, 10);
    }

    if (isNaN(min) || isNaN(max)) {
        console.warn(`Invalid range format (NaN values): "${rangeStr}"`);
        return null;
    }

    if (min > max) {
        console.warn(`Invalid range format (min > max): "${rangeStr}"`);
        return null;
    }

    return {
        min,
        max,
        minInclusive,
        maxInclusive
    };
}

/**
 * Validates a single numeric value against a range constraint.
 *
 * @param value The numeric value to validate.
 * @param range The parsed range object with bounds and inclusivity flags.
 * @returns `true` if the value is within the range, `false` otherwise.
 */
function validateRangeValue(value: number, range: ParsedRange): boolean {
    if (range.minInclusive) {
        if (value < range.min) return false;
    } else {
        if (value <= range.min) return false;
    }

    if (range.maxInclusive) {
        if (value > range.max) return false;
    } else {
        if (value >= range.max) return false;
    }

    return true;
}

/**
 * Validates `(range)` constraints for a single field.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance being validated.
 * @param field The field descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateFieldRange<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    field: any,
    violations: ConstraintViolation[]
): void {
    const rangeOpt = getRegisteredOption('range');

    if (!rangeOpt) {
        return;
    }

    const fieldValue = (message as any)[field.localName];

    if (field.fieldKind === 'list') {
        if (!field.listKind || field.listKind !== 'scalar' || !field.scalar) {
            return;
        }

        const scalarType = field.scalar;
        if (!isNumericType(scalarType)) {
            return;
        }

        if (!hasOption(field, rangeOpt)) {
            return;
        }

        const rangeStr = getOption(field, rangeOpt);
        if (!rangeStr || typeof rangeStr !== 'string') {
            return;
        }

        const range = parseRange(rangeStr, scalarType);
        if (!range) {
            return;
        }

        if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
            return;
        }

        fieldValue.forEach((element: number, index: number) => {
            if (!validateRangeValue(element, range)) {
                violations.push(createViolation(
                    schema.typeName,
                    [field.name, String(index)],
                    element,
                    rangeStr
                ));
            }
        });
    } else if (field.fieldKind === 'scalar') {
        if (!field.scalar) {
            return;
        }

        const scalarType = field.scalar;
        if (!isNumericType(scalarType)) {
            return;
        }

        if (!hasOption(field, rangeOpt)) {
            return;
        }

        const rangeStr = getOption(field, rangeOpt);
        if (!rangeStr || typeof rangeStr !== 'string') {
            return;
        }

        const range = parseRange(rangeStr, scalarType);
        if (!range) {
            return;
        }

        if (fieldValue === undefined || fieldValue === null) {
            return;
        }

        if (!validateRangeValue(fieldValue, range)) {
            violations.push(createViolation(
                schema.typeName,
                [field.name],
                fieldValue,
                rangeStr
            ));
        }
    }
}

/**
 * Validates the `(range)` option for all fields in a message.
 *
 * This is a field-level constraint that enforces bounded numeric ranges.
 * Only applies to numeric scalar types (integers, floats, doubles).
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateRangeFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    for (const field of schema.fields) {
        validateFieldRange(schema, message, field, violations);
    }
}
