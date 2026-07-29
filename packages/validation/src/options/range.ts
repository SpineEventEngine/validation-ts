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
import { default_message, RangeOptionSchema } from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { ViolationFactory, MessageFields, type ValidationContext } from "../validation-contract.js";
import { NumericValues, type ResolvedBound } from "./numeric.js";

/** Validates `(range)` for one field in orchestration order. */
/** Owns `(range)` option validation. */
export const Range = {
  /** Adds a violation when a numeric field lies outside its `(range)` interval.
   * @param context Root type and path carried into created violations.
   * @param schema Descriptor used to resolve range references.
   * @param message Candidate message supplying the compared value.
   * @param field Numeric field declaring `(range)`.
   * @param violations Mutable collection receiving range diagnostics.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
  ): void {
    const extension = ValidationOptions.get("range");
    if (!extension || !hasOption(field, extension)) return;
    const option = getOption(field, extension);
    const scalar = NumericValues.assertTarget("range", schema, field);
    const parsed = Range.parse(option.value, scalar, schema, message, field);
    const fieldValue = MessageFields.read(message, field);
    const values = field.fieldKind === "list" ? fieldValue : [fieldValue];
    if (!Array.isArray(values)) return;
    for (const raw of values) {
      const value = NumericValues.runtime(raw, scalar);
      const lowerComparison = NumericValues.compare(value, parsed.lower.value);
      const upperComparison = NumericValues.compare(value, parsed.upper.value);
      const validLower = parsed.lowerInclusive ? lowerComparison >= 0 : lowerComparison > 0;
      const validUpper = parsed.upperInclusive ? upperComparison <= 0 : upperComparison < 0;
      if (!NumericValues.isNaN(value) && validLower && validUpper) continue;
      violations.push(
        ViolationFactory.create(context.atField(field), field, raw, {
          customMessage: option.errorMsg || undefined,
          defaultMessage: getOption(RangeOptionSchema, default_message),
          placeholders: {
            "range.value": parsed.display,
            value: String(raw),
            range: parsed.display,
          },
        }),
      );
    }
  },

  /** Parses a `(range)` declaration into comparable lower and upper bounds.
   * @param declaration Range expression from the field option.
   * @param scalar Numeric scalar type accepted by the field.
   * @param schema Descriptor used to resolve field references.
   * @param message Candidate message used to read referenced bounds.
   * @param field Field whose range expression is interpreted.
   * @returns Parsed bounds and their inclusive or exclusive delimiters.
   */
  parse(
    declaration: string,
    scalar: ReturnType<typeof NumericValues.assertTarget>,
    schema: DescMessage,
    message: Message,
    field: DescField,
  ) {
    const match = /^(\s*)(\[|\()([\s\S]*?)(\.\.)([\s\S]*?)(\]|\))(\s*)$/.exec(declaration);
    if (!match || !match[3].trim() || !match[5].trim())
      throw NumericValues.configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [
        field.name,
      ]);
    const lowerToken = match[3].trim();
    const upperToken = match[5].trim();
    const lower = NumericValues.resolveBound(lowerToken, scalar, "range", schema, message, field);
    const upper = NumericValues.resolveBound(upperToken, scalar, "range", schema, message, field);
    if (NumericValues.compare(lower.value, upper.value) > 0)
      throw NumericValues.configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [
        field.name,
      ]);
    return {
      lower,
      upper,
      lowerInclusive: match[2] === "[",
      upperInclusive: match[6] === "]",
      display: `${match[1]}${match[2]}${Range.renderBound(match[3], lowerToken, lower)}${match[4]}${Range.renderBound(match[5], upperToken, upper)}${match[6]}${match[7]}`,
    };
  },

  /** Renders a parsed bound for use in a range diagnostic.
   * @param raw Original range expression.
   * @param token Text identifying the bound within the expression.
   * @param bound Resolved numeric bound value.
   * @returns The literal token or resolved numeric value shown to callers.
   */
  renderBound(raw: string, token: string, bound: ResolvedBound): string {
    return bound.display === token ? raw : raw.replace(token, bound.display);
  },
} as const;
