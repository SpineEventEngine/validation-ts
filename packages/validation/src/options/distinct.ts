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

/** Groups collection values that compare equal under a field descriptor. */
interface EqualityClass {
  /** Value used to compare later members of this equality group. */
  representative: unknown;
  /** Number of collection values in this equality group. */
  count: number;
}

/** Owns descriptor-defined `(distinct)` validation and its private formatting helpers. */
export const Distinct = {
  /** Adds one diagnostic for each duplicate equality class in a marked collection.
   * @param context Root type and path carried into created violations.
   * @param schema Descriptor used to describe unsupported option targets.
   * @param message Candidate message supplying the list or map values.
   * @param field Collection field declaring `(distinct)`.
   * @param violations Mutable collection receiving duplicate diagnostics.
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

  /** Applies `(distinct)` validation to every field in a message descriptor.
   * @param schema Descriptor whose fields are inspected for `(distinct)`.
   * @param message Candidate message supplying collection values.
   * @param violations Mutable collection receiving duplicate diagnostics.
   */
  validateAll(schema: DescMessage, message: Message, violations: ConstraintViolation[]): void {
    const context = new ValidationContext(schema.typeName);
    for (const field of schema.fields)
      Distinct.validate(context, schema, message, field, violations);
  },

  /** Extracts comparable elements from a list or map field value.
   * @param field Collection descriptor that determines list or map handling.
   * @param collection Runtime collection read from the candidate message.
   * @returns The list elements or map values, or an empty array for another value.
   */
  collectionValues(field: DescField, collection: unknown): unknown[] {
    if (field.fieldKind === "list") return Array.isArray(collection) ? collection : [];
    if (collection === null || typeof collection !== "object") return [];
    return Object.values(collection);
  },

  /** Compares two collection elements with the equality semantics of their descriptor.
   * @param field Collection descriptor that selects scalar, enum, or message equality.
   * @param left First collection element to compare.
   * @param right Second collection element to compare.
   * @returns Whether both elements belong to the same equality class.
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

  /** Reads the optional duplicate-message configuration from a collection field.
   * @param field Field whose `(if_has_duplicates)` extension is read.
   * @returns The configured duplicate diagnostic, if the field declares one.
   */
  diagnostic(field: DescField): IfHasDuplicatesOption | undefined {
    const extension = ValidationOptions.get("if_has_duplicates");
    return hasOption(field, extension) ? getOption(field, extension) : undefined;
  },

  /** Renders a collection value for a duplicate diagnostic placeholder.
   * @param value Runtime collection or duplicate representative to render.
   * @returns A stable diagnostic representation of `value`.
   */
  formatCollection(value: unknown): string {
    return Distinct.formatValue(value);
  },

  /** Renders a nested runtime value without losing bytes or bigint information.
   * @param value Scalar, collection, map, or message-like value to render.
   * @returns A stable diagnostic representation of `value`.
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

  /** Encodes binary field content as lower-case hexadecimal for diagnostics.
   * @param value Bytes from a field or collection element.
   * @returns The hexadecimal encoding of `value`.
   */
  bytesToHex(value: Uint8Array): string {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  },
} as const;
