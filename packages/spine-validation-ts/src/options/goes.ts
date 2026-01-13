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
 * Validation logic for the `(goes)` option.
 *
 * The `(goes)` option is a field-level constraint that enforces field dependency:
 * a field can only be set if another specified field is also set.
 *
 * Semantics:
 * - If field A has `(goes).with = "B"`:
 *   - A is set AND B is NOT set → VIOLATION
 *   - A is set AND B is set → VALID
 *   - A is NOT set → VALID (regardless of B)
 *
 * Examples:
 * ```protobuf
 * string time = 3 [(goes).with = "date"];
 * // time can only be set when date is also set
 *
 * string text_color = 1 [(goes).with = "highlight_color"];
 * string highlight_color = 2 [(goes).with = "text_color"];
 * // Mutual dependency: both must be set or both unset
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import type { GoesOption } from '../generated/spine/options_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Checks if a field has a non-default value (is "set") in proto3.
 *
 * For proto3 fields:
 * - Message fields: non-default instance (not `undefined`/`null`)
 * - String fields: non-empty string
 * - Numeric fields: non-zero value
 * - Bool fields: any value (`true` or `false` both count as "set")
 * - Enum fields: non-zero value
 *
 * @param value The field value to check.
 * @returns `true` if the field is considered set, `false` otherwise.
 */
function isFieldSet(value: any): boolean {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value === 'string') {
        return value !== '';
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'boolean') {
        return true;
    }

    if (typeof value === 'object') {
        return true;
    }

    return false;
}

/**
 * Creates a constraint violation for `(goes)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName The name of the field that violated the constraint.
 * @param requiredFieldName The name of the field that must be set.
 * @param fieldValue The actual value of the violating field.
 * @param customErrorMsg Optional custom error message from `(goes).error_msg`.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string,
    requiredFieldName: string,
    fieldValue: any,
    customErrorMsg?: string
): ConstraintViolation {
    const errorMessage = customErrorMsg ||
        `The field \`${fieldName}\` can only be set when the field \`${requiredFieldName}\` is defined.`;

    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName: [fieldName]
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: errorMessage,
            placeholderValue: {
                'value': fieldValue !== undefined ? String(fieldValue) : ''
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Validates `(goes)` constraint for a single field.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance being validated.
 * @param field The field descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateFieldGoes<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    field: any,
    violations: ConstraintViolation[]
): void {
    const goesOpt = getRegisteredOption('goes');

    if (!goesOpt) {
        return;
    }

    if (!hasOption(field, goesOpt)) {
        return;
    }

    const goesOption = getOption(field, goesOpt) as GoesOption;
    const requiredFieldName = goesOption.with;

    if (!requiredFieldName) {
        return;
    }

    const fieldValue = (message as any)[field.localName];

    if (!isFieldSet(fieldValue)) {
        return;
    }

    const requiredField = schema.fields.find(f => f.name === requiredFieldName);

    if (!requiredField) {
        violations.push(createViolation(
            schema.typeName,
            field.name,
            requiredFieldName,
            fieldValue,
            `Field \`${field.name}\` references non-existent field \`${requiredFieldName}\` in (goes).with option.`
        ));
        return;
    }

    const requiredFieldValue = (message as any)[requiredField.localName];

    if (!isFieldSet(requiredFieldValue)) {
        violations.push(createViolation(
            schema.typeName,
            field.name,
            requiredFieldName,
            fieldValue,
            goesOption.errorMsg
        ));
    }
}

/**
 * Validates the `(goes)` option for all fields in a message.
 *
 * The `(goes)` option enforces field dependency validation: a field can only
 * be set if another specified field is also set.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateGoesFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    for (const field of schema.fields) {
        validateFieldGoes(schema, message, field, violations);
    }
}
