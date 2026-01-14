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
 * Validation logic for the `(required)` option.
 *
 * The `(required)` option ensures that a field has a non-default value set.
 */

import type { Message } from '@bufbuild/protobuf';
import { hasOption, getOption, create } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation object for `(required)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param fieldName The name of the field that violated the constraint.
 * @param fieldValue The actual value of the field.
 * @param violationMessage The error message describing the violation.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    fieldName: string,
    fieldValue: any,
    violationMessage: string
): ConstraintViolation {
    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName: [fieldName]
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: violationMessage,
            placeholderValue: {
                'field': fieldName,
                'value': String(fieldValue ?? '')
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Validates the `(required)` option for all fields in a message.
 *
 * This function checks each field with the `(required)` option to ensure it has
 * a non-default value. Custom error messages can be provided via the `(if_missing)` option.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateRequiredFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    const requiredOption = getRegisteredOption('required');
    const ifMissingOption = getRegisteredOption('if_missing');

    for (const field of schema.fields) {
        if (!requiredOption || !hasOption(field, requiredOption) || !getOption(field, requiredOption)) {
            continue;
        }

        let violationMessage = 'A value must be set.';

        if (ifMissingOption && hasOption(field, ifMissingOption)) {
            const ifMissingOpt = getOption(field, ifMissingOption);
            if (ifMissingOpt && typeof ifMissingOpt === 'object' && 'errorMsg' in ifMissingOpt) {
                violationMessage = (ifMissingOpt as any).errorMsg || violationMessage;
            }
        }

        const fieldValue = (message as any)[field.localName];
        let isViolated = false;

        if (field.fieldKind === 'scalar') {
            if (field.scalar) {
                switch (field.scalar.toString()) {
                    case 'ScalarType.STRING':
                        isViolated = !fieldValue || fieldValue === '';
                        break;
                    case 'ScalarType.BYTES':
                        isViolated = !fieldValue || fieldValue.length === 0;
                        break;
                    case 'ScalarType.INT32':
                    case 'ScalarType.INT64':
                    case 'ScalarType.UINT32':
                    case 'ScalarType.UINT64':
                    case 'ScalarType.SINT32':
                    case 'ScalarType.SINT64':
                    case 'ScalarType.FIXED32':
                    case 'ScalarType.FIXED64':
                    case 'ScalarType.SFIXED32':
                    case 'ScalarType.SFIXED64':
                    case 'ScalarType.FLOAT':
                    case 'ScalarType.DOUBLE':
                        isViolated = fieldValue === undefined || fieldValue === null;
                        break;
                    case 'ScalarType.BOOL':
                        isViolated = fieldValue === undefined || fieldValue === null;
                        break;
                    default:
                        isViolated = !fieldValue;
                }
            }
        } else if (field.fieldKind === 'message') {
            isViolated = !fieldValue;
        } else if (field.fieldKind === 'enum') {
            isViolated = fieldValue === undefined || fieldValue === null;
        }

        if (field.fieldKind === 'list') {
            isViolated = !fieldValue || !Array.isArray(fieldValue) || fieldValue.length === 0;
            if (isViolated && !violationMessage.includes('at least')) {
                violationMessage = 'At least one element must be present.';
            }
        }

        if (isViolated) {
            violations.push(createViolation(
                schema.typeName,
                field.name,
                fieldValue,
                violationMessage
            ));
        }
    }
}
