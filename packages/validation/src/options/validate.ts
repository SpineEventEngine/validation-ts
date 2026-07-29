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

/** Leaf-only recursion for the descriptor-defined `(validate)` option. */

import { create, equals, getOption, hasOption, isMessage } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message, MessageShape, Registry } from "@bufbuild/protobuf";
import { anyUnpack } from "@bufbuild/protobuf/wkt";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { MessageFields, type ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

/** Internal recursive validation seam, supplied by the validation orchestrator. */
/** Describes the purpose of the `NestedValidator` member. */
export type NestedValidator = <S extends DescMessage>(
  schema: S,
  message: MessageShape<S>,
  context: ValidationContext,
  registry: Registry,
) => ConstraintViolation[];

/** Owns descriptor-defined recursive `(validate)` option processing. */
export const NestedValidation = {
  /** Validates one field in declaration order, preserving the root validation context. */
  /** Traverses nested messages selected by a `(validate)` field option.
   * @param context Root type and path for nested violations.
   * @param schema Descriptor containing the nested field.
   * @param message Candidate message supplying nested values.
   * @param field Field declaring `(validate)`.
   * @param violations Collection receiving leaf violations.
   * @param registry Descriptor registry used for `Any` resolution.
   * @param validateNested Callback that validates each nested message.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
    registry: Registry,
    validateNested: NestedValidator,
  ): void {
    const option = ValidationOptions.get("validate");
    if (!option || !hasOption(field, option) || !getOption(field, option)) return;

    const nestedSchema = NestedValidation.messageSchema(field);
    if (!nestedSchema) {
      throw new ValidationConfigurationError({
        code: "UNSUPPORTED_OPTION_TARGET",
        option: "validate",
        typeName: schema.typeName,
        fieldPath: [field.name],
      });
    }

    const value = MessageFields.read(message, field);
    const nestedContext = context.atField(field);
    if (field.fieldKind === "message") {
      if (value === undefined || value === null || NestedValidation.isDefault(nestedSchema, value))
        return;
      NestedValidation.append(
        nestedSchema,
        value,
        nestedContext,
        registry,
        violations,
        validateNested,
      );
      return;
    }

    if (field.fieldKind === "list") {
      if (!Array.isArray(value)) return;
      for (const element of value)
        NestedValidation.append(
          nestedSchema,
          element,
          nestedContext,
          registry,
          violations,
          validateNested,
        );
      return;
    }

    if (value === null || typeof value !== "object") return;
    for (const element of Object.values(value)) {
      NestedValidation.append(
        nestedSchema,
        element,
        nestedContext,
        registry,
        violations,
        validateNested,
      );
    }
  },

  /** Extracts the message descriptor carried by a nested-validation field.
   * @param field Field descriptor to inspect.
   * @returns The nested message descriptor, when the field contains messages.
   */
  messageSchema(field: DescField): DescMessage | undefined {
    if (field.fieldKind === "message") return field.message;
    if (field.fieldKind === "list" && field.listKind === "message") return field.message;
    if (field.fieldKind === "map" && field.mapKind === "message") return field.message;
    return undefined;
  },

  /** Determines whether a nested message equals its schema default instance.
   * @param schema Descriptor used for equality comparison.
   * @param value Nested runtime value to compare.
   * @returns Whether the value is absent or equal to the default message.
   */
  isDefault(schema: DescMessage, value: unknown): boolean {
    return equals(schema, value as never, create(schema));
  },

  /** Appends leaf violations produced by one nested message value.
   * @param schema Descriptor of the nested message.
   * @param value Nested runtime message to validate.
   * @param context Parent violation context.
   * @param registry Descriptor registry used by recursive validation.
   * @param violations Collection receiving nested leaf violations.
   * @param validateNested Callback that performs recursive validation.
   */
  append(
    schema: DescMessage,
    value: unknown,
    context: ValidationContext,
    registry: Registry,
    violations: ConstraintViolation[],
    validateNested: NestedValidator,
  ): void {
    if (schema.typeName === "google.protobuf.Any") {
      NestedValidation.appendPackedAny(value, context, registry, violations, validateNested);
      return;
    }
    if (!isMessage(value, schema)) return;
    violations.push(...validateNested(schema, value, context, registry));
  },

  /** Unpacks a known `Any` payload and appends its nested leaf violations.
   * @param value Runtime `Any` message to unpack.
   * @param context Parent violation context.
   * @param registry Registry used to resolve the packed message type.
   * @param violations Collection receiving nested leaf violations.
   * @param validateNested Callback that performs recursive validation.
   */
  appendPackedAny(
    value: unknown,
    context: ValidationContext,
    registry: Registry,
    violations: ConstraintViolation[],
    validateNested: NestedValidator,
  ): void {
    if (!value || typeof value !== "object") return;
    let unpacked;
    try {
      unpacked = anyUnpack(value as Parameters<typeof anyUnpack>[0], registry);
    } catch {
      // A malformed or unrecognized type URL cannot be unpacked and is valid by contract.
      return;
    }
    if (!unpacked) return;
    const schema = registry.getMessage(unpacked.$typeName);
    if (schema && isMessage(unpacked, schema))
      violations.push(...validateNested(schema, unpacked, context, registry));
  },
} as const;
