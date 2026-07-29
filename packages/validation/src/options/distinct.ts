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

/** Validation of the descriptor-defined `(distinct)` option. */

import { equals, getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";
import { scalarEquals } from "@bufbuild/protobuf/reflect";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import {
  default_message,
  IfHasDuplicatesOptionSchema as DuplicatesOptionSchema,
  type IfHasDuplicatesOption,
} from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { ViolationFactory, MessageFields, ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

/** Describes the purpose of the `EqualityClass` member. */
interface EqualityClass {
  /** Describes the purpose of the `representative` member. */
  representative: unknown;
  /** Describes the purpose of the `count` member. */
  count: number;
}

/** Owns descriptor-defined `(distinct)` validation and its private formatting helpers. */
export const Distinct = {
  /** Validates `(distinct)` for one field in deterministic orchestration order. */
  /** Processes inputs for `validate`.
   * @param context Supplies the context input.
   * @param schema Supplies the schema input.
   * @param message Supplies the message input.
   * @param field Supplies the field input.
   * @param violations Supplies the violations input.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
  ): void {
    const extension = ValidationOptions.get("distinct");
    if (!extension || !hasOption(field, extension)) return;
    if (getOption(field, extension) !== true) return;
    if (field.fieldKind !== "list" && field.fieldKind !== "map") {
      throw new ValidationConfigurationError({
        code: "UNSUPPORTED_OPTION_TARGET",
        option: "distinct",
        typeName: schema.typeName,
        fieldPath: [field.name],
      });
    }

    const collection = MessageFields.read(message, field);
    const values = Distinct.collectionValues(field, collection);
    if (values.length < 2) return;

    const classes: EqualityClass[] = [];
    for (const value of values) {
      const existing = classes.find((candidate) =>
        Distinct.valuesAreEqual(field, candidate.representative, value),
      );
      if (existing) {
        existing.count++;
      } else {
        classes.push({ representative: value, count: 1 });
      }
    }

    const custom = Distinct.diagnostic(field);
    for (const duplicate of classes) {
      if (duplicate.count < 2) continue;
      violations.push(
        ViolationFactory.create(context.atField(field), field, duplicate.representative, {
          customMessage: custom?.errorMsg || undefined,
          defaultMessage: getOption(DuplicatesOptionSchema, default_message),
          placeholders: {
            "field.value": Distinct.formatCollection(collection),
            "field.duplicates": Distinct.formatCollection([duplicate.representative]),
          },
        }),
      );
    }
  },

  /** Validates every field for internal callers outside orchestration. */
  /** Processes inputs for `validateAll`.
   * @param schema Supplies the schema input.
   * @param message Supplies the message input.
   * @param violations Supplies the violations input.
   */
  validateAll(schema: DescMessage, message: Message, violations: ConstraintViolation[]): void {
    const context = new ValidationContext(schema.typeName);
    for (const field of schema.fields)
      Distinct.validate(context, schema, message, field, violations);
  },

  /** Processes inputs for `collectionValues`.
   * @param field Supplies the field input.
   * @param collection Supplies the collection input.
   * @returns Returns the computed result.
   */
  collectionValues(field: DescField, collection: unknown): unknown[] {
    if (field.fieldKind === "list") return Array.isArray(collection) ? collection : [];
    if (collection === null || typeof collection !== "object") return [];
    return Object.values(collection);
  },

  /** Processes inputs for `valuesAreEqual`.
   * @param field Supplies the field input.
   * @param left Supplies the left input.
   * @param right Supplies the right input.
   * @returns Returns the computed result.
   */
  valuesAreEqual(field: DescField, left: unknown, right: unknown): boolean {
    if (field.fieldKind === "list") {
      if (field.listKind === "scalar")
        return scalarEquals(field.scalar, left as never, right as never);
      if (field.listKind === "enum") return Number(left) === Number(right);
      return equals(field.message, left as never, right as never);
    }
    if (field.fieldKind !== "map") {
      throw new Error("distinct values must come from a repeated or map field");
    }
    if (field.mapKind === "scalar")
      return scalarEquals(field.scalar, left as never, right as never);
    if (field.mapKind === "enum") return Number(left) === Number(right);
    return equals(field.message, left as never, right as never);
  },

  /** Processes inputs for `diagnostic`.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  diagnostic(field: DescField): IfHasDuplicatesOption | undefined {
    const extension = ValidationOptions.get("if_has_duplicates");
    return hasOption(field, extension) ? getOption(field, extension) : undefined;
  },

  /** Processes inputs for `formatCollection`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  formatCollection(value: unknown): string {
    return Distinct.formatValue(value);
  },

  /** Processes inputs for `formatValue`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  formatValue(value: unknown): string {
    if (value instanceof Uint8Array) return Distinct.bytesToHex(value);
    if (typeof value === "bigint") return value.toString();
    if (Array.isArray(value)) return `[${value.map(Distinct.formatValue).join(", ")}]`;
    if (value !== null && typeof value === "object") {
      return `{${Object.entries(value)
        .map(([key, nested]) => `${key}=${Distinct.formatValue(nested)}`)
        .join(", ")}}`;
    }
    return String(value);
  },

  /** Processes inputs for `bytesToHex`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  bytesToHex(value: Uint8Array): string {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  },
} as const;
