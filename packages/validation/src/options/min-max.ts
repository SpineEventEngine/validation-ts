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

import { getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb";
import {
  default_message,
  MaxOptionSchema,
  MinOptionSchema,
  type MaxOption,
  type MinOption,
} from "../generated/spine/options_pb";
import { getRegisteredOption } from "../options-registry";
import { createConstraintViolation, type ValidationContext } from "../validation-contract";
import {
  assertNumericTarget,
  compareNumeric,
  isNaNNumeric,
  resolveBound,
  runtimeNumeric,
} from "./numeric";

/** Validates `(min)` and `(max)` for a single field in orchestration order. */
export function validateMinMaxField(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  validateBound("min", context, schema, message, field, violations);
  validateBound("max", context, schema, message, field, violations);
}

function validateBound(
  name: "min" | "max",
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const extension = getRegisteredOption(name);
  if (!extension || !hasOption(field, extension)) return;
  const option = getOption(field, extension) as MinOption | MaxOption;
  const scalar = assertNumericTarget(name, schema, field);
  const declaration = option.value;
  const bound = resolveBound(declaration, scalar, name, schema, message, field);
  const exclusive = "exclusive" in option && option.exclusive;
  const values = field.fieldKind === "list" ? message[field.localName] : [message[field.localName]];
  if (!Array.isArray(values)) return;
  for (const raw of values) {
    const value = runtimeNumeric(raw, scalar);
    const comparison = compareNumeric(value, bound.value);
    const valid =
      !isNaNNumeric(value) &&
      (name === "min"
        ? exclusive
          ? comparison > 0
          : comparison >= 0
        : exclusive
          ? comparison < 0
          : comparison <= 0);
    if (valid) continue;
    const defaultMessage = getOption(
      name === "min" ? MinOptionSchema : MaxOptionSchema,
      default_message,
    );
    const customMessage = option.errorMsg || undefined;
    violations.push(
      createConstraintViolation(context.atField(field), field, raw, {
        customMessage,
        defaultMessage,
        placeholders: {
          [`${name}.value`]: bound.display,
          [`${name}.operator`]: name === "min" ? (exclusive ? ">" : ">=") : exclusive ? "<" : "<=",
          // Retained for already-authored custom messages; documented templates
          // use the namespaced placeholders above.
          value: String(raw),
          other: bound.display,
        },
      }),
    );
  }
}
