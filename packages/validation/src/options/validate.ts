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
import { getRegisteredOption } from "../options-registry.js";
import { readField, type ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

/** Internal recursive validation seam, supplied by the validation orchestrator. */
export type NestedValidator = <S extends DescMessage>(
  schema: S,
  message: MessageShape<S>,
  context: ValidationContext,
  registry: Registry,
) => ConstraintViolation[];

/** Validates one field in declaration order, preserving the root validation context. */
export function validateNestedField(
  context: ValidationContext,
  schema: DescMessage,
  message: Message,
  field: DescField,
  violations: ConstraintViolation[],
  registry: Registry,
  validateNested: NestedValidator,
): void {
  const option = getRegisteredOption("validate");
  if (!option || !hasOption(field, option) || !getOption(field, option)) return;

  const nestedSchema = messageSchema(field);
  if (!nestedSchema) {
    throw new ValidationConfigurationError({
      code: "UNSUPPORTED_OPTION_TARGET",
      option: "validate",
      typeName: schema.typeName,
      fieldPath: [field.name],
    });
  }

  const value = readField(message, field);
  const nestedContext = context.atField(field);
  if (field.fieldKind === "message") {
    if (value === undefined || value === null || isDefault(nestedSchema, value)) return;
    appendNested(nestedSchema, value, nestedContext, registry, violations, validateNested);
    return;
  }

  if (field.fieldKind === "list") {
    if (!Array.isArray(value)) return;
    for (const element of value)
      appendNested(nestedSchema, element, nestedContext, registry, violations, validateNested);
    return;
  }

  if (value === null || typeof value !== "object") return;
  for (const element of Object.values(value)) {
    appendNested(nestedSchema, element, nestedContext, registry, violations, validateNested);
  }
}

function messageSchema(field: DescField): DescMessage | undefined {
  if (field.fieldKind === "message") return field.message;
  if (field.fieldKind === "list" && field.listKind === "message") return field.message;
  if (field.fieldKind === "map" && field.mapKind === "message") return field.message;
  return undefined;
}

function isDefault(schema: DescMessage, value: unknown): boolean {
  return equals(schema, value as never, create(schema));
}

function appendNested(
  schema: DescMessage,
  value: unknown,
  context: ValidationContext,
  registry: Registry,
  violations: ConstraintViolation[],
  validateNested: NestedValidator,
): void {
  if (schema.typeName === "google.protobuf.Any") {
    appendPackedAny(value, context, registry, violations, validateNested);
    return;
  }
  if (!isMessage(value, schema)) return;
  violations.push(...validateNested(schema, value, context, registry));
}

function appendPackedAny(
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
}
