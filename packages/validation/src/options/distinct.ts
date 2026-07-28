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
import type { DescField } from "@bufbuild/protobuf";
import { scalarEquals } from "@bufbuild/protobuf/reflect";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import {
  default_message,
  IfHasDuplicatesOptionSchema,
  type IfHasDuplicatesOption,
} from "../generated/spine/options_pb.js";
import { getRegisteredOption } from "../options-registry.js";
import { createConstraintViolation, ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

interface EqualityClass {
  representative: unknown;
  count: number;
}

/** Validates `(distinct)` for one field in deterministic orchestration order. */
export function validateDistinctField(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const extension = getRegisteredOption("distinct");
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

  const collection = message[field.localName];
  const values = collectionValues(field, collection);
  if (values.length < 2) return;

  const classes: EqualityClass[] = [];
  for (const value of values) {
    const existing = classes.find((candidate) =>
      valuesAreEqual(field, candidate.representative, value),
    );
    if (existing) {
      existing.count++;
    } else {
      classes.push({ representative: value, count: 1 });
    }
  }

  const custom = distinctDiagnostic(field);
  for (const duplicate of classes) {
    if (duplicate.count < 2) continue;
    violations.push(
      createConstraintViolation(context.atField(field), field, duplicate.representative, {
        customMessage: custom?.errorMsg || undefined,
        defaultMessage: getOption(IfHasDuplicatesOptionSchema, default_message),
        placeholders: {
          "field.value": formatCollection(collection),
          "field.duplicates": formatCollection([duplicate.representative]),
        },
      }),
    );
  }
}

/** Retained for internal callers that validate all fields outside orchestration. */
export function validateDistinctFields(
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  violations: ConstraintViolation[],
): void {
  const context = new ValidationContext(schema.typeName);
  for (const field of schema.fields)
    validateDistinctField(context, schema, message, field, violations);
}

function collectionValues(field: DescField, collection: unknown): unknown[] {
  if (field.fieldKind === "list") return Array.isArray(collection) ? collection : [];
  if (collection === null || typeof collection !== "object") return [];
  return Object.values(collection);
}

function valuesAreEqual(field: DescField, left: unknown, right: unknown): boolean {
  if (field.fieldKind === "list") {
    if (field.listKind === "scalar")
      return scalarEquals(field.scalar, left as never, right as never);
    if (field.listKind === "enum") return Number(left) === Number(right);
    return equals(field.message, left as never, right as never);
  }
  if (field.fieldKind !== "map") {
    throw new Error("distinct values must come from a repeated or map field");
  }
  if (field.mapKind === "scalar") return scalarEquals(field.scalar, left as never, right as never);
  if (field.mapKind === "enum") return Number(left) === Number(right);
  return equals(field.message, left as never, right as never);
}

function distinctDiagnostic(field: DescField): IfHasDuplicatesOption | undefined {
  const extension = getRegisteredOption("if_has_duplicates");
  return extension && hasOption(field, extension)
    ? (getOption(field, extension) as IfHasDuplicatesOption)
    : undefined;
}

function formatCollection(value: unknown): string {
  return formatValue(value);
}

function formatValue(value: unknown): string {
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .map(([key, nested]) => `${key}=${formatValue(nested)}`)
      .join(", ")}}`;
  }
  return String(value);
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
