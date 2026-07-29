/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { create } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message, MessageShape, Registry } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "./generated/spine/validate/validation_error_pb.js";
import { FieldPathSchema } from "./generated/spine/base/field_path_pb.js";
import { MessageFields, ViolationFactory, type ValidationContext } from "./validation-contract.js";

type LegacyFieldValidator = <S extends DescMessage>(
  schema: S,
  message: MessageShape<S>,
  violations: ConstraintViolation[],
) => void;

/** The common internal contract for field-level validation adapters. */
export interface FieldValidator {
  validate<S extends DescMessage>(
    context: ValidationContext,
    schema: S,
    message: MessageShape<S>,
    field: DescField,
    violations: ConstraintViolation[],
    registry: Registry,
  ): void;
}

/**
 * Adapts an existing all-fields validator to the field-first orchestration
 * seam while normalizing its output through the shared violation envelope.
 */
export const ValidationOrchestration = {
  legacyFieldValidator(legacy: LegacyFieldValidator): FieldValidator {
    return {
      validate<S extends DescMessage>(
        context: ValidationContext,
        schema: S,
        message: MessageShape<S>,
        field: DescField,
        violations: ConstraintViolation[],
      ) {
        const legacyViolations: ConstraintViolation[] = [];
        const fields = [field] as typeof schema.fields;
        fields.find = schema.fields.find.bind(schema.fields);
        const fieldSchema = { ...schema, fields } as S;
        legacy(fieldSchema, message, legacyViolations);

        for (const legacyViolation of legacyViolations) {
          const legacyMessage = legacyViolation.message;
          const normalized = ViolationFactory.create(
            context.atField(field),
            field,
            ValidationOrchestration.offendingValue(message, field, legacyViolation),
            {
              defaultMessage: legacyMessage?.withPlaceholders,
              placeholders: legacyMessage?.placeholderValue,
            },
          );
          const nestedPath = ValidationOrchestration.nestedFieldPath(field, legacyViolation);
          if (nestedPath.length > 0) {
            normalized.fieldPath = create(FieldPathSchema, {
              fieldName: [field.name, ...nestedPath],
            });
          }
          violations.push(normalized);
        }
      },
    };
  },

  /** Normalizes a message-level or oneof-level legacy violation. */
  appendMessageViolation(
    context: ValidationContext,
    legacyViolation: ConstraintViolation,
    violations: ConstraintViolation[],
  ): void {
    const legacyMessage = legacyViolation.message;
    const normalized = ViolationFactory.create(context, undefined, undefined, {
      defaultMessage: legacyMessage?.withPlaceholders,
      placeholders: legacyMessage?.placeholderValue,
    });
    violations.push(normalized);
  },

  offendingValue(message: Message, field: DescField, violation: ConstraintViolation): unknown {
    const value = MessageFields.read(message, field);
    const path = violation.fieldPath?.fieldName ?? [];

    if (field.fieldKind === "list") {
      if (!Array.isArray(value)) return undefined;
      const bracketedIndex = path[0]?.match(new RegExp(`^${field.name}\\[(\\d+)]$`));
      if (bracketedIndex) return value[Number(bracketedIndex[1])];
      if (path.length >= 2) return value[Number(path[1])];
      return undefined;
    }
    if (field.fieldKind === "map" && value && typeof value === "object")
      return Object.entries(value).find(([key]) => key === path[1])?.[1];
    return value;
  },

  nestedFieldPath(field: DescField, violation: ConstraintViolation): string[] {
    const path = violation.fieldPath?.fieldName ?? [];
    if (path.length <= 1 || path[0] !== field.name) return [];
    if (field.fieldKind === "list" || field.fieldKind === "map") return path.slice(2);
    return path.slice(1);
  },
} as const;
