/*
 * Copyright 2026, TeamDev. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb";
import {
  default_message,
  RangeOptionSchema,
  type RangeOption,
} from "../generated/spine/options_pb";
import { getRegisteredOption } from "../options-registry";
import { createConstraintViolation, type ValidationContext } from "../validation-contract";
import {
  assertNumericTarget,
  compareNumeric,
  configurationError,
  resolveBound,
  runtimeNumeric,
} from "./numeric";

/** Validates `(range)` for one field in orchestration order. */
export function validateRangeField(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const extension = getRegisteredOption("range");
  if (!extension || !hasOption(field, extension)) return;
  const option = getOption(field, extension) as RangeOption;
  const scalar = assertNumericTarget("range", schema, field);
  const parsed = parseRange(option.value, scalar, schema, message, field);
  const values = field.fieldKind === "list" ? message[field.localName] : [message[field.localName]];
  if (!Array.isArray(values)) return;
  for (const raw of values) {
    const value = runtimeNumeric(raw, scalar);
    const lowerComparison = compareNumeric(value, parsed.lower.value);
    const upperComparison = compareNumeric(value, parsed.upper.value);
    const validLower = parsed.lowerInclusive ? lowerComparison >= 0 : lowerComparison > 0;
    const validUpper = parsed.upperInclusive ? upperComparison <= 0 : upperComparison < 0;
    if (validLower && validUpper) continue;
    violations.push(
      createConstraintViolation(context.atField(field), field, raw, {
        customMessage: option.errorMsg || undefined,
        defaultMessage: getOption(RangeOptionSchema, default_message),
        placeholders: {
          "range.value": `${parsed.open}${parsed.lower.display}..${parsed.upper.display}${parsed.close}`,
          value: String(raw),
          range: `${parsed.open}${parsed.lower.display}..${parsed.upper.display}${parsed.close}`,
        },
      }),
    );
  }
}

function parseRange(
  declaration: string,
  scalar: ReturnType<typeof assertNumericTarget>,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
) {
  const match = /^\s*([[(])\s*(.*?)\s*\.\.\s*(.*?)\s*([\])])\s*$/.exec(declaration);
  if (!match || !match[2] || !match[3])
    throw configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [field.name]);
  const lower = resolveBound(match[2], scalar, "range", schema, message, field);
  const upper = resolveBound(match[3], scalar, "range", schema, message, field);
  if (compareNumeric(lower.value, upper.value) > 0)
    throw configurationError("INVALID_OPTION_VALUE", "range", schema.typeName, [field.name]);
  return {
    lower,
    upper,
    lowerInclusive: match[1] === "[",
    upperInclusive: match[4] === "]",
    open: match[1],
    close: match[4],
  };
}
