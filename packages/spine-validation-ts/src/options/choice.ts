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
 * Validation logic for the `(choice)` option.
 *
 * The `(choice)` option is a oneof-level constraint that ensures at least one
 * field in a oneof group is set.
 *
 * Features:
 * - Validates that a oneof group has at least one field set when required
 * - Supports custom error messages via ChoiceOption.errorMsg
 * - Works with any field types within the oneof group
 *
 * Examples:
 * ```protobuf
 * message PaymentMethod {
 *   oneof method {
 *     option (choice).required = true;
 *     option (choice).error_msg = "Payment method is required.";
 *
 *     CreditCard credit_card = 1;
 *     BankAccount bank_account = 2;
 *     PayPal paypal = 3;
 *   }
 * }
 * ```
 */

import type { Message } from '@bufbuild/protobuf';
import { getOption, hasOption, create } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ConstraintViolation } from '../generated/spine/validate/validation_error_pb';
import { ConstraintViolationSchema } from '../generated/spine/validate/validation_error_pb';
import { FieldPathSchema } from '../generated/spine/base/field_path_pb';
import { TemplateStringSchema } from '../generated/spine/validate/error_message_pb';
import type { ChoiceOption } from '../generated/spine/options_pb';
import { getRegisteredOption } from '../options-registry';

/**
 * Creates a constraint violation for `(choice)` validation failures.
 *
 * @param typeName The fully qualified message type name.
 * @param oneofName The name of the oneof group.
 * @param customErrorMsg Optional custom error message from ChoiceOption.
 * @returns A `ConstraintViolation` object.
 */
function createViolation(
    typeName: string,
    oneofName: string,
    customErrorMsg?: string
): ConstraintViolation {
    const errorMsg = customErrorMsg ||
        `The oneof group '${oneofName}' must have one of its fields set.`;

    return create(ConstraintViolationSchema, {
        typeName,
        fieldPath: create(FieldPathSchema, {
            fieldName: [oneofName]
        }),
        fieldValue: undefined,
        message: create(TemplateStringSchema, {
            withPlaceholders: errorMsg,
            placeholderValue: {
                'group.path': oneofName,
                'parent.type': typeName
            }
        }),
        msgFormat: '',
        param: [],
        violation: []
    });
}

/**
 * Checks if any field in a oneof group is set.
 *
 * In Protobuf-ES v2, oneofs are represented as a single property with
 * `case` and `value` fields. The oneof is set if `case` is defined.
 *
 * @param message The message instance.
 * @param oneof The oneof descriptor.
 * @returns `true` if at least one field is set, `false` otherwise.
 */
function isOneofSet(message: any, oneof: any): boolean {
    const oneofValue = message[oneof.localName];
    return oneofValue !== undefined && oneofValue !== null && oneofValue.case !== undefined;
}

/**
 * Validates a single oneof group for `(choice)` constraint.
 *
 * @param schema The message schema containing oneof descriptors.
 * @param message The message instance being validated.
 * @param oneof The oneof descriptor to validate.
 * @param violations Array to collect constraint violations.
 */
function validateOneofChoice<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    oneof: any,
    violations: ConstraintViolation[]
): void {
    const choiceOpt = getRegisteredOption('choice');

    if (!choiceOpt || !hasOption(oneof, choiceOpt)) {
        return;
    }

    const choiceOption = getOption(oneof, choiceOpt) as ChoiceOption;

    // Only validate if required is true
    if (choiceOption.required === true) {
        if (!isOneofSet(message, oneof)) {
            violations.push(createViolation(
                schema.typeName,
                oneof.name,
                choiceOption.errorMsg || undefined
            ));
        }
    }
}

/**
 * Validates the `(choice)` option for all oneof groups in a message.
 *
 * This is a oneof-level constraint that ensures at least one field
 * in the oneof group is set when the option is enabled.
 *
 * @param schema The message schema containing oneof descriptors.
 * @param message The message instance to validate.
 * @param violations Array to collect constraint violations.
 */
export function validateChoiceFields<T extends Message>(
    schema: GenMessage<T>,
    message: any,
    violations: ConstraintViolation[]
): void {
    if (!schema.oneofs || schema.oneofs.length === 0) {
        return;
    }

    for (const oneof of schema.oneofs) {
        validateOneofChoice(schema, message, oneof, violations);
    }
}
