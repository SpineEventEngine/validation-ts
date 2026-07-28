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
import { getRegisteredOption } from "../options-registry.js";
import {
  createConstraintViolation,
  readField,
  type ValidationContext,
} from "../validation-contract.js";
import {
  assertNumericTarget,
  compareNumeric,
  configurationError,
  isNaNNumeric,
  resolveBound,
  runtimeNumeric,
} from "./numeric.js";

/** Validates `(range)` for one field in orchestration order. */
export function validateRangeField(
  context: ValidationContext,
  schema: DescMessage,
  message: Message,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const extension = getRegisteredOption("range");
  if (!extension || !hasOption(field, extension)) return;
  const option = getOption(field, extension);
  const scalar = assertNumericTarget("range", schema, field);
  const parsed = parseRange(option.value, scalar, schema, message, field);
  const fieldValue = readField(message, field);
  const values = field.fieldKind === "list" ? fieldValue : [fieldValue];
  if (!Array.isArray(values)) return;
  for (const raw of values) {
    const value = runtimeNumeric(raw, scalar);
    const lowerComparison = compareNumeric(value, parsed.lower.value);
    const upperComparison = compareNumeric(value, parsed.upper.value);
    const validLower = parsed.lowerInclusive ? lowerComparison >= 0 : lowerComparison > 0;
    const validUpper = parsed.upperInclusive ? upperComparison <= 0 : upperComparison < 0;
    if (!isNaNNumeric(value) && validLower && validUpper) continue;
    violations.push(
      createConstraintViolation(context.atField(field), field, raw, {
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
}

function parseRange(
  declaration: string,
  scalar: ReturnType<typeof assertNumericTarget>,
  schema: DescMessage,
  message: Message,
  field: DescField,
) {
  const match = /^(\s*)(\[|\()([\s\S]*?)(\.\.)([\s\S]*?)(\]|\))(\s*)$/.exec(declaration);
  if (!match || !match[3].trim() || !match[5].trim())
    throw configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [field.name]);
  const lowerToken = match[3].trim();
  const upperToken = match[5].trim();
  const lower = resolveBound(lowerToken, scalar, "range", schema, message, field);
  const upper = resolveBound(upperToken, scalar, "range", schema, message, field);
  if (compareNumeric(lower.value, upper.value) > 0)
    throw configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [field.name]);
  return {
    lower,
    upper,
    lowerInclusive: match[2] === "[",
    upperInclusive: match[6] === "]",
    display: `${match[1]}${match[2]}${renderBound(match[3], lowerToken, lower)}${match[4]}${renderBound(match[5], upperToken, upper)}${match[6]}${match[7]}`,
  };
}

function renderBound(raw: string, token: string, bound: ReturnType<typeof resolveBound>): string {
  return bound.display === token ? raw : raw.replace(token, bound.display);
}
