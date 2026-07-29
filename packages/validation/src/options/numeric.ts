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

import { create, isMessage, ScalarType } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";

import { ValidationConfigurationError } from "../validation-configuration-error.js";
import { MessageFields } from "../validation-contract.js";

export type NumericValue = number | bigint;

const INTEGER = /^[+-]?\d+$/;
const FLOAT = /^[+-]?(?:\d+\.\d*|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const FLOAT_MAX = 3.4028234663852886e38;

const integerLimits: Readonly<Partial<Record<ScalarType, readonly [bigint, bigint]>>> = {
  [ScalarType.INT32]: [-2147483648n, 2147483647n],
  [ScalarType.SINT32]: [-2147483648n, 2147483647n],
  [ScalarType.SFIXED32]: [-2147483648n, 2147483647n],
  [ScalarType.UINT32]: [0n, 4294967295n],
  [ScalarType.FIXED32]: [0n, 4294967295n],
  [ScalarType.INT64]: [-9223372036854775808n, 9223372036854775807n],
  [ScalarType.SINT64]: [-9223372036854775808n, 9223372036854775807n],
  [ScalarType.SFIXED64]: [-9223372036854775808n, 9223372036854775807n],
  [ScalarType.UINT64]: [0n, 18446744073709551615n],
  [ScalarType.FIXED64]: [0n, 18446744073709551615n],
};

export interface ResolvedBound {
  value: NumericValue;
  display: string;
}

/** Owns numeric parsing, reference resolution, and comparison for numeric options. */
export const NumericValues = {
  numericScalar(field: DescField): ScalarType | undefined {
    if (field.fieldKind === "scalar")
      return NumericValues.isNumeric(field.scalar) ? field.scalar : undefined;
    if (field.fieldKind === "list" && field.listKind === "scalar")
      return NumericValues.isNumeric(field.scalar) ? field.scalar : undefined;
    return undefined;
  },

  assertTarget(option: string, schema: DescMessage, field: DescField): ScalarType {
    const scalar = NumericValues.numericScalar(field);
    if (scalar !== undefined) return scalar;
    throw NumericValues.configurationError("UNSUPPORTED_OPTION_TARGET", option, schema.typeName, [
      field.name,
    ]);
  },

  parseLiteral(
    declaration: string,
    scalar: ScalarType,
    option: string,
    typeName: string,
    fieldPath: readonly string[],
  ): NumericValue {
    if (NumericValues.isFloating(scalar)) {
      if (!FLOAT.test(declaration))
        throw NumericValues.configurationError("INVALID_OPTION_VALUE", option, typeName, fieldPath);
      const value = Number(declaration);
      if (!Number.isFinite(value) || (scalar === ScalarType.FLOAT && Math.abs(value) > FLOAT_MAX))
        throw NumericValues.configurationError("INVALID_OPTION_VALUE", option, typeName, fieldPath);
      return value;
    }
    if (!INTEGER.test(declaration))
      throw NumericValues.configurationError("INVALID_OPTION_VALUE", option, typeName, fieldPath);
    const value = BigInt(declaration);
    const limit = integerLimits[scalar];
    if (!limit || value < limit[0] || value > limit[1])
      throw NumericValues.configurationError("INVALID_OPTION_VALUE", option, typeName, fieldPath);
    return NumericValues.is64Bit(scalar) ? value : Number(value);
  },

  resolveBound(
    declaration: string,
    scalar: ScalarType,
    option: string,
    schema: DescMessage,
    message: Message,
    target: DescField,
  ): ResolvedBound {
    if (!NumericValues.looksLikeReference(declaration)) {
      return {
        value: NumericValues.parseLiteral(declaration, scalar, option, schema.typeName, [
          target.name,
        ]),
        display: declaration,
      };
    }
    const segments = declaration.split(".");
    let descriptor: DescMessage = schema;
    let current: Message = message;
    for (let index = 0; index < segments.length; index++) {
      const name = segments[index];
      const field = descriptor.fields.find((candidate) => candidate.name === name);
      if (!field)
        throw NumericValues.configurationError("UNKNOWN_FIELD_REFERENCE", option, schema.typeName, [
          target.name,
        ]);
      const finalSegment = index === segments.length - 1;
      if (finalSegment) {
        const referencedScalar = NumericValues.numericScalar(field);
        if (referencedScalar === undefined || field.fieldKind !== "scalar")
          throw NumericValues.configurationError(
            "INVALID_FIELD_REFERENCE",
            option,
            schema.typeName,
            [target.name],
          );
        const raw = MessageFields.read(current, field);
        const value = NumericValues.runtime(raw ?? field.getDefaultValue(), referencedScalar);
        return { value, display: `${declaration} (${String(value)})` };
      }
      if (field.fieldKind !== "message")
        throw NumericValues.configurationError("INVALID_FIELD_REFERENCE", option, schema.typeName, [
          target.name,
        ]);
      const nested = MessageFields.read(current, field);
      current = isMessage(nested, field.message) ? nested : create(field.message);
      descriptor = field.message;
    }
    throw NumericValues.configurationError("UNKNOWN_FIELD_REFERENCE", option, schema.typeName, [
      target.name,
    ]);
  },

  compare(left: NumericValue, right: NumericValue): number {
    return left < right ? -1 : left > right ? 1 : 0;
  },

  isNaN(value: NumericValue): boolean {
    return typeof value === "number" && Number.isNaN(value);
  },

  runtime(value: unknown, scalar: ScalarType): NumericValue {
    if (NumericValues.is64Bit(scalar))
      return typeof value === "bigint" ? value : BigInt(String(value));
    return Number(value);
  },

  configurationError(
    code:
      | "UNSUPPORTED_OPTION_TARGET"
      | "INVALID_OPTION_VALUE"
      | "UNKNOWN_FIELD_REFERENCE"
      | "INVALID_FIELD_REFERENCE",
    option: string,
    typeName: string,
    fieldPath: readonly string[],
  ): ValidationConfigurationError {
    return new ValidationConfigurationError({ code, option, typeName, fieldPath });
  },

  isNumeric(scalar: ScalarType): boolean {
    return integerLimits[scalar] !== undefined || NumericValues.isFloating(scalar);
  },

  isFloating(scalar: ScalarType): boolean {
    return scalar === ScalarType.FLOAT || scalar === ScalarType.DOUBLE;
  },

  is64Bit(scalar: ScalarType): boolean {
    return (
      scalar === ScalarType.INT64 ||
      scalar === ScalarType.SINT64 ||
      scalar === ScalarType.SFIXED64 ||
      scalar === ScalarType.UINT64 ||
      scalar === ScalarType.FIXED64
    );
  },

  looksLikeReference(value: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value);
  },
} as const;
