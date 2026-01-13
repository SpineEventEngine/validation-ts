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
 * Validation logic for the `(required_field)` option.
 *
 * The `(required_field)` option is a message-level constraint that requires
 * at least one field from a set of alternatives or combinations of fields.
 *
 * Syntax:
 * - `|` (pipe): OR operator - at least one field must be set
 * - `&` (ampersand): AND operator - all fields must be set together
 * - Parentheses for grouping: `(field1 & field2) | field3`
 *
 * Examples:
 * ```protobuf
 * message User {
 *   option (required_field) = "id | email";  // Either id OR email must be set
 *   string id = 1;
 *   string email = 2;
 * }
 *
 * message PhoneNumber {
 *   option (required_field) = "phone & country_code";  // Both phone AND country_code must be set
 *   string phone = 1;
 *   string country_code = 2;
 * }
 *
 * message PersonName {
 *   option (required_field) = "given_name | (honorific_prefix & family_name)";
 *   // Either given_name alone OR both honorific_prefix AND family_name
 *   string given_name = 1;
 *   string honorific_prefix = 2;
 *   string family_name = 3;
 * }
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { hasOption, getOption, create, getExtension, hasExtension, ScalarType } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation for `(required_field)` at the message level.
 *
 * @param typeName The fully qualified message type name.
 * @param expression The required field expression that was not satisfied.
 * @param violationMessage The error message describing the violation.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    expression: string,
    violationMessage: string
): ConstraintViolation {
    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName: []
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: violationMessage,
            placeholderValue: {
                'expression': expression
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Checks if a field is set (has a non-default value).
 *
 * @param message The message instance to check.
 * @param fieldName The name of the field to check.
 * @param schema The message schema containing field descriptors.
 * @returns `true` if the field is set, `false` otherwise.
 */
function isFieldSet(message: any, fieldName: string, schema: GenMessage<any>): boolean {
    const field = schema.fields.find(f => f.name === fieldName);
    if (!field) {
        console.warn(`Field "${fieldName}" not found in schema ${schema.typeName}`);
        return false;
    }

    const fieldValue = (message as any)[field.localName];

    if (field.fieldKind === 'scalar') {
        if (field.scalar) {
            const scalarType = field.scalar;
            if (scalarType === ScalarType.STRING || scalarType === ScalarType.BYTES) {
                return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            } else if (scalarType === ScalarType.BOOL) {
                return fieldValue !== undefined && fieldValue !== null;
            } else {
                return fieldValue !== undefined && fieldValue !== null && fieldValue !== 0;
            }
        }
    } else if (field.fieldKind === 'message') {
        return fieldValue !== undefined && fieldValue !== null;
    } else if (field.fieldKind === 'enum') {
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== 0;
    } else if (field.fieldKind === 'list' || field.fieldKind === 'map') {
        return fieldValue !== undefined && fieldValue !== null &&
               (Array.isArray(fieldValue) ? fieldValue.length > 0 : Object.keys(fieldValue).length > 0);
    }

    return false;
}

/**
 * Tokenizes the `(required_field)` expression into tokens.
 *
 * @param expression The expression string to tokenize.
 * @returns Array of tokens (field names, operators, parentheses).
 */
function tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        if (char === '(' || char === ')' || char === '|' || char === '&') {
            if (current.trim()) {
                tokens.push(current.trim());
                current = '';
            }
            tokens.push(char);
        } else if (char === ' ' || char === '\t' || char === '\n') {
            if (current.trim()) {
                tokens.push(current.trim());
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        tokens.push(current.trim());
    }

    return tokens;
}

/**
 * Parses and evaluates the `(required_field)` expression.
 *
 * @param expression The expression string to evaluate.
 * @param message The message instance to validate.
 * @param schema The message schema containing field descriptors.
 * @returns `true` if the expression is satisfied, `false` otherwise.
 */
function evaluateExpression(
    expression: string,
    message: any,
    schema: GenMessage<any>
): boolean {
    const tokens = tokenize(expression);

    let index = 0;

    function parseOr(): boolean {
        let result = parseAnd();

        while (index < tokens.length && tokens[index] === '|') {
            index++;
            const right = parseAnd();
            result = result || right;
        }

        return result;
    }

    function parseAnd(): boolean {
        let result = parsePrimary();

        while (index < tokens.length && tokens[index] === '&') {
            index++;
            const right = parsePrimary();
            result = result && right;
        }

        return result;
    }

    function parsePrimary(): boolean {
        if (index >= tokens.length) {
            return false;
        }

        const token = tokens[index];

        if (token === '(') {
            index++;
            const result = parseOr();
            if (index < tokens.length && tokens[index] === ')') {
                index++;
            }
            return result;
        } else if (token === '|' || token === '&' || token === ')') {
            return false;
        } else {
            index++;
            return isFieldSet(message, token, schema);
        }
    }

    return parseOr();
}

/**
 * Validates the `(required_field)` option for messages.
 *
 * This is a message-level constraint that requires specific combinations
 * of fields to be set according to the expression.
 *
 * @param schema The message schema containing field descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateRequiredFieldOption<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    const requiredFieldOption = getRegisteredOption('required_field');

    if (!requiredFieldOption) {
        return;
    }

    const options = (schema.proto as any).options;
    if (!options) {
        return;
    }

    const unknownFields = options.$unknown as Array<{ no: number; wireType: number; data: Uint8Array }>;
    if (unknownFields) {
        const requiredFieldExtension = unknownFields.find((f: any) => f.no === 73902);
        if (requiredFieldExtension) {
            const dataWithoutLength = requiredFieldExtension.data.slice(1);
            const decoder = new TextDecoder();
            const expression = decoder.decode(dataWithoutLength);

            if (expression && typeof expression === 'string') {
                const satisfied = evaluateExpression(expression, message, schema);

                if (!satisfied) {
                    const violationMessage = `At least one of the required field combinations must be satisfied: ${expression}`;
                    violations.push(createViolation(
                        schema.typeName,
                        expression,
                        violationMessage
                    ));
                }
                return;
            }
        }
    }

    if (!hasExtension(options, requiredFieldOption)) {
        return;
    }

    const expression = getExtension(options, requiredFieldOption);
    if (!expression || typeof expression !== 'string') {
        return;
    }

    const satisfied = evaluateExpression(expression, message, schema);

    if (!satisfied) {
        const violationMessage = `At least one of the required field combinations must be satisfied: ${expression}`;
        violations.push(createViolation(
            schema.typeName,
            expression,
            violationMessage
        ));
    }
}
