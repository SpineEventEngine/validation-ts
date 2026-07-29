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
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import {
  default_message,
  MaxOptionSchema,
  MinOptionSchema,
} from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { ViolationFactory, MessageFields, type ValidationContext } from "../validation-contract.js";
import { NumericValues } from "./numeric.js";

/** Validates `(min)` and `(max)` for a single field in orchestration order. */
/** Owns `(min)` and `(max)` option validation. */
export const MinMax = {
  /** Checks the minimum and maximum bounds declared on one numeric field.
   * @param context Root type and path carried into created violations.
   * @param schema Descriptor used to resolve numeric references.
   * @param message Candidate message supplying the compared values.
   * @param field Numeric field declaring `(min)` or `(max)`.
   * @param violations Mutable collection receiving bound diagnostics.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
  ): void {
    MinMax.validateBound("min", context, schema, message, field, violations);
    MinMax.validateBound("max", context, schema, message, field, violations);
  },

  /** Checks one named numeric bound and adds its diagnostic when it is exceeded.
   * @param name Option name identifying the bound extension to evaluate.
   * @param context Root type and path carried into created violations.
   * @param schema Descriptor used to resolve numeric references.
   * @param message Candidate message supplying the compared values.
   * @param field Numeric field declaring the named bound.
   * @param violations Mutable collection receiving the bound diagnostic.
   */
  validateBound(
    name: "min" | "max",
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
  ): void {
    const extension = ValidationOptions.get(name);
    if (!extension || !hasOption(field, extension)) return;
    const option = getOption(field, extension);
    const scalar = NumericValues.assertTarget(name, schema, field);
    const declaration = option.value;
    const bound = NumericValues.resolveBound(declaration, scalar, name, schema, message, field);
    const exclusive = "exclusive" in option && option.exclusive;
    const fieldValue = MessageFields.read(message, field);
    const values = field.fieldKind === "list" ? fieldValue : [fieldValue];
    if (!Array.isArray(values)) return;
    for (const raw of values) {
      const value = NumericValues.runtime(raw, scalar);
      const comparison = NumericValues.compare(value, bound.value);
      const valid =
        !NumericValues.isNaN(value) &&
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
        ViolationFactory.create(context.atField(field), field, raw, {
          customMessage,
          defaultMessage,
          placeholders: {
            [`${name}.value`]: bound.display,
            [`${name}.operator`]:
              name === "min" ? (exclusive ? ">" : ">=") : exclusive ? "<" : "<=",
            // Retained for already-authored custom messages; documented templates
            // use the namespaced placeholders above.
            value: String(raw),
            other: bound.display,
          },
        }),
      );
    }
  },
} as const;
