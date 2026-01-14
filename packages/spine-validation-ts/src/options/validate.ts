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
 * Validation logic for the `(validate)` option.
 *
 * The `(validate)` option is a field-level constraint that enables recursive
 * validation of nested message fields, repeated message fields, and map fields.
 *
 * Supported field types:
 * - Message fields (singular)
 * - Repeated message fields
 * - Map fields (validates each entry)
 *
 * Features:
 * - Recursive validation: validates constraints in nested messages
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
 * Customer customer = 3 [(validate) = true];
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
 * Gets the default error message for nested validation failures.
 *
 * @returns The default error message.
 */
function getErrorMessage(): string {
    return 'Nested message validation failed.';
}

/**
 * Validates a single message field by recursively calling validate on it.
 *
 * @param parentTypeName The fully qualified parent message type name.
 * @param fieldPath Array representing the field path from parent.
 * @param nestedMessage The nested message instance to validate.
 * @param nestedSchema The schema of the nested message.
 * @param violations Array to collect constraint violations.
 */
function validateNestedMessage(
    parentTypeName: string,
    fieldPath: string[],
    nestedMessage: any,
    nestedSchema: GenMessage<any>,
    violations: ConstraintViolation[]
): void {
    const { validate } = require('../validation');

    const nestedViolations = validate(nestedSchema, nestedMessage);

    if (nestedViolations.length > 0) {
        const errorMessage = getErrorMessage();

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
