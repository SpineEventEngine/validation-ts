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
 * Validation logic for the `(min)` and `(max)` options.
 *
 * The `(min)` and `(max)` options are field-level constraints that enforce
 * numeric range validation on scalar numeric fields.
 *
 * Supported field types:
 * - `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`
 * - `fixed32`, `fixed64`, `sfixed32`, `sfixed64`
 * - `float`, `double`
 *
 * Features:
 * - Inclusive bounds by default (value >= min, value <= max)
 * - Exclusive bounds via the `exclusive` flag (value > min, value < max)
 * - Custom error messages with token replacement (`{value}`, `{other}`)
 * - Validation applies to repeated fields (each element checked independently)
 *
 * Examples:
 * ```protobuf
 * int32 age = 1 [(min).value = "0"];  // age >= 0
 * double price = 2 [(min) = {value: "0.0", exclusive: true}];  // price > 0.0
 * int32 percentage = 3 [(max).value = "100"];  // percentage <= 100
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create, ScalarType } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import type { MinOption, MaxOption } from '../generated/spine/options_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation for `(min)` or `(max)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName Array representing the field path.
 * @param fieldValue The actual value of the field.
 * @param errorMessage The error message describing the violation.
 * @param thresholdValue The threshold value that was violated.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string[],
    fieldValue: any,
    errorMessage: string,
    thresholdValue: string
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
                'value': String(fieldValue),
                'other': thresholdValue
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
 * Parses a threshold value string based on the field's scalar type.
 *
 * @param valueStr The threshold value as a string.
 * @param scalarType The scalar type of the field.
 * @returns The parsed numeric threshold value.
 */
function parseThreshold(valueStr: string, scalarType: ScalarType): number {
    if (scalarType === ScalarType.FLOAT || scalarType === ScalarType.DOUBLE) {
        return parseFloat(valueStr);
    } else {
        return parseInt(valueStr, 10);
    }
}

/**
 * Validates a single numeric value against `(min)` constraint.
 *
 * @param value The numeric value to validate.
 * @param minOption The `(min)` option configuration.
 * @param scalarType The scalar type of the field.
 * @returns `true` if the value meets the constraint, `false` otherwise.
 */
function validateMinValue(
    value: number,
    minOption: MinOption,
    scalarType: ScalarType
): boolean {
    const threshold = parseThreshold(minOption.value, scalarType);

    if (isNaN(threshold)) {
        console.warn(`Invalid min threshold value: "${minOption.value}"`);
        return true;
    }

    if (minOption.exclusive) {
        return value > threshold;
    } else {
        return value >= threshold;
    }
}

/**
 * Validates a single numeric value against `(max)` constraint.
 *
 * @param value The numeric value to validate.
 * @param maxOption The `(max)` option configuration.
 * @param scalarType The scalar type of the field.
 * @returns `true` if the value meets the constraint, `false` otherwise.
 */
function validateMaxValue(
    value: number,
    maxOption: MaxOption,
    scalarType: ScalarType
): boolean {
    const threshold = parseThreshold(maxOption.value, scalarType);

    if (isNaN(threshold)) {
        console.warn(`Invalid max threshold value: "${maxOption.value}"`);
        return true;
    }

    if (maxOption.exclusive) {
        return value < threshold;
    } else {
        return value <= threshold;
    }
}

/**
 * Gets the error message for `(min)` constraint violations.
 *
 * @param minOption The `(min)` option configuration.
 * @returns The error message (custom or default).
 */
function getMinErrorMessage(minOption: MinOption): string {
    if (minOption.errorMsg) {
        return minOption.errorMsg;
    }

    const comparator = minOption.exclusive ? 'greater than' : 'at least';
    return `The number must be ${comparator} {other}.`;
}

/**
 * Gets the error message for `(max)` constraint violations.
 *
 * @param maxOption The `(max)` option configuration.
 * @returns The error message (custom or default).
 */
function getMaxErrorMessage(maxOption: MaxOption): string {
    if (maxOption.errorMsg) {
        return maxOption.errorMsg;
    }

    const comparator = maxOption.exclusive ? 'less than' : 'at most';
    return `The number must be ${comparator} {other}.`;
}

/**
 * Validates `(min)` and `(max)` constraints for a single field.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance being validated.
 * @param field The field descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateFieldMinMax<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    field: any,
    violations: ConstraintViolation[]
): void {
    const minOpt = getRegisteredOption('min');
    const maxOpt = getRegisteredOption('max');

    if (!minOpt && !maxOpt) {
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

        if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
            return;
        }

        fieldValue.forEach((element: number, index: number) => {
            validateSingleValue(
                schema,
                field,
                element,
                [field.name, String(index)],
                scalarType,
                violations
            );
        });
    } else if (field.fieldKind === 'scalar') {
        if (!field.scalar) {
            return;
        }

        const scalarType = field.scalar;
        if (!isNumericType(scalarType)) {
            return;
        }

        if (fieldValue === undefined || fieldValue === null) {
            return;
        }

        validateSingleValue(
            schema,
            field,
            fieldValue,
            [field.name],
            scalarType,
            violations
        );
    }
}

/**
 * Validates a single numeric value against `(min)` and `(max)` constraints.
 *
 * @param schema The message schema containing field descriptors.
 * @param field The field descriptor being validated.
 * @param value The numeric value to validate.
 * @param fieldPath Array representing the field path.
 * @param scalarType The scalar type of the field.
 * @param violations Array to collect constraint violations.
 */
function validateSingleValue(
    schema: GenMessage<any>,
    field: any,
    value: number,
    fieldPath: string[],
    scalarType: ScalarType,
    violations: ConstraintViolation[]
): void {
    const minOpt = getRegisteredOption('min');
    const maxOpt = getRegisteredOption('max');

    if (minOpt && hasOption(field, minOpt)) {
        const minOption = getOption(field, minOpt) as MinOption;

        if (minOption && minOption.value) {
            const isValid = validateMinValue(value, minOption, scalarType);

            if (!isValid) {
                violations.push(createViolation(
                    schema.typeName,
                    fieldPath,
                    value,
                    getMinErrorMessage(minOption),
                    minOption.value
                ));
            }
        }
    }

    if (maxOpt && hasOption(field, maxOpt)) {
        const maxOption = getOption(field, maxOpt) as MaxOption;

        if (maxOption && maxOption.value) {
            const isValid = validateMaxValue(value, maxOption, scalarType);

            if (!isValid) {
                violations.push(createViolation(
                    schema.typeName,
                    fieldPath,
                    value,
                    getMaxErrorMessage(maxOption),
                    maxOption.value
                ));
            }
        }
    }
}

/**
 * Validates the `(min)` and `(max)` options for all fields in a message.
 *
 * These are field-level constraints that enforce numeric range validation.
 * Only applies to numeric scalar types (integers, floats, doubles).
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateMinMaxFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    for (const field of schema.fields) {
        validateFieldMinMax(schema, message, field, violations);
    }
}
