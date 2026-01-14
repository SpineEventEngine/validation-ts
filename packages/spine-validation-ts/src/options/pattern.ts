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
 * Validation logic for the `(pattern)` option.
 *
 * The `(pattern)` option validates that a string field matches a given regular expression.
 */

import type { Message } from '@bufbuild/protobuf';
import { hasOption, getOption, create, ScalarType } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation object for `(pattern)` validation failures.
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
 * Validates a single string value against a regex pattern with modifiers.
 *
 * @param value The string value to validate.
 * @param regex The regular expression pattern.
 * @param patternOption The pattern option object with optional modifiers.
 * @returns `true` if the value matches the pattern, `false` otherwise.
 */
function validatePatternValue(value: string, regex: string, patternOption: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    try {
        let flags = '';
        const modifier = patternOption.modifier;

        if (modifier) {
            if (modifier.caseInsensitive) {
                flags += 'i';
            }
            if (modifier.multiline) {
                flags += 'm';
            }
            if (modifier.dotAll) {
                flags += 's';
            }
            if (modifier.unicode) {
                flags += 'u';
            }
        }

        const pattern = new RegExp(regex, flags);
        const partialMatch = modifier?.partialMatch || false;

        if (partialMatch) {
            return pattern.test(value);
        } else {
            return pattern.test(value);
        }
    } catch (error) {
        console.error(`Invalid regex pattern: ${regex}`, error);
        return false;
    }
}

/**
 * Validates the `(pattern)` option for string fields.
 *
 * This function checks if string field values match the specified regular expression pattern.
 * Supports pattern modifiers like `case_insensitive`, `multiline`, `dot_all`, etc.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validatePatternFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    const patternOption = getRegisteredOption('pattern');

    if (!patternOption) {
        return;
    }

    for (const field of schema.fields) {
        if (!hasOption(field, patternOption)) {
            continue;
        }

        const patternValue = getOption(field, patternOption);
        if (!patternValue || typeof patternValue !== 'object' || !('regex' in patternValue)) {
            continue;
        }

        const regex = (patternValue as any).regex;
        const errorMsg = (patternValue as any).errorMsg ||
                         `The string must match the regular expression \`${regex}\`.`;

        const fieldValue = (message as any)[field.localName];

        if (field.fieldKind === 'list') {
            if (Array.isArray(fieldValue)) {
                for (let i = 0; i < fieldValue.length; i++) {
                    const itemValue = fieldValue[i];
                    if (typeof itemValue === 'string' && !validatePatternValue(itemValue, regex, patternValue)) {
                        violations.push(createViolation(
                            schema.typeName,
                            `${field.name}[${i}]`,
                            itemValue,
                            errorMsg
                        ));
                    }
                }
            }
        } else if (field.fieldKind === 'scalar' && field.scalar === ScalarType.STRING) {
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                if (!validatePatternValue(fieldValue, regex, patternValue)) {
                    violations.push(createViolation(
                        schema.typeName,
                        field.name,
                        fieldValue,
                        errorMsg
                    ));
                }
            }
        }
    }
}
