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

/** Represents a parsed numeric option value as a JavaScript number or bigint. */
export type NumericValue = number | bigint;

const INTEGER = /^[+-]?\d+$/;
const FLOAT = /^[+-]?(?:\d+\.\d*|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const FLOAT_MAX = 3.4028234663852886e38;

/** Maps each integer scalar kind to its inclusive lower and upper limits. */
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

/** Couples a comparison-ready numeric bound with its diagnostic representation. */
export interface ResolvedBound {
  /** Parsed bound used for numeric comparison. */
  value: NumericValue;
  /** Literal or resolved bound text included in a diagnostic. */
  display: string;
}

/** Owns numeric parsing, reference resolution, and comparison for numeric options. */
export const NumericValues = {
  /** Identifies the supported numeric scalar type of a field.
   * @param field Field descriptor whose scalar type is inspected.
   * @returns The numeric scalar type, or `undefined` for a nonnumeric field.
   */
  numericScalar(field: DescField): ScalarType | undefined {
    if (field.fieldKind === "scalar")
      return NumericValues.isNumeric(field.scalar) ? field.scalar : undefined;
    if (field.fieldKind === "list" && field.listKind === "scalar")
      return NumericValues.isNumeric(field.scalar) ? field.scalar : undefined;
    return undefined;
  },

  /** Rejects a numeric option applied to an unsupported field target.
   * @param option Name of the numeric option being configured.
   * @param schema Descriptor owning the configured field.
   * @param field Field descriptor whose target compatibility is checked.
   * @returns The field's supported numeric scalar type.
   */
  assertTarget(option: string, schema: DescMessage, field: DescField): ScalarType {
    const scalar = NumericValues.numericScalar(field);
    if (scalar !== undefined) return scalar;
    throw NumericValues.configurationError("UNSUPPORTED_OPTION_TARGET", option, schema.typeName, [
      field.name,
    ]);
  },

  /** Parses a numeric literal according to the target scalar type.
   * @param declaration Literal text from an option declaration.
   * @param scalar Scalar type that constrains parsing.
   * @param option Name of the option owning the literal.
   * @param typeName Message type reported in configuration errors.
   * @param fieldPath Field path reported in configuration errors.
   * @returns The parsed number or bigint value.
   */
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

  /** Resolves a numeric bound from either a literal or a message-field reference.
   * @param declaration Literal or reference declared by the option.
   * @param scalar Scalar type expected for the resolved bound.
   * @param option Name of the option owning the bound.
   * @param schema Descriptor used to resolve references.
   * @param message Candidate message used to read referenced fields.
   * @param target Field being constrained by the bound.
   * @returns The resolved comparable bound.
   */
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

  /** Orders two numeric values without coercing bigint values through numbers.
   * @param left First numeric operand.
   * @param right Second numeric operand.
   * @returns A negative, zero, or positive comparison result.
   */
  compare(left: NumericValue, right: NumericValue): number {
    return left < right ? -1 : left > right ? 1 : 0;
  },

  /** Detects a floating-point `NaN` value.
   * @param value Runtime numeric value to inspect.
   * @returns Whether `value` is a number whose value is `NaN`.
   */
  isNaN(value: NumericValue): boolean {
    return typeof value === "number" && Number.isNaN(value);
  },

  /** Normalizes a declared numeric value to its runtime scalar representation.
   * @param value Parsed numeric value.
   * @param scalar Target Protobuf scalar type.
   * @returns The number or bigint representation used by message fields.
   */
  runtime(value: unknown, scalar: ScalarType): NumericValue {
    if (NumericValues.is64Bit(scalar))
      return typeof value === "bigint" ? value : BigInt(String(value));
    return Number(value);
  },

  /** Creates a numeric-option configuration error with its location details.
   * @param code Configuration failure classification.
   * @param option Name of the invalid numeric option.
   * @param typeName Message type containing the invalid declaration.
   * @param fieldPath Field path containing the invalid declaration.
   * @returns A structured error ready to throw.
   */
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

  /** Determines whether a Protobuf scalar supports numeric bounds.
   * @param scalar Protobuf scalar type to classify.
   * @returns Whether validation accepts numeric values of this scalar type.
   */
  isNumeric(scalar: ScalarType): boolean {
    return integerLimits[scalar] !== undefined || NumericValues.isFloating(scalar);
  },

  /** Determines whether a scalar uses floating-point comparison.
   * @param scalar Protobuf scalar type to classify.
   * @returns Whether `scalar` is float or double.
   */
  isFloating(scalar: ScalarType): boolean {
    return scalar === ScalarType.FLOAT || scalar === ScalarType.DOUBLE;
  },

  /** Determines whether a scalar uses a 64-bit integer representation.
   * @param scalar Protobuf scalar type to classify.
   * @returns Whether `scalar` is a 64-bit integer variant.
   */
  is64Bit(scalar: ScalarType): boolean {
    return (
      scalar === ScalarType.INT64 ||
      scalar === ScalarType.SINT64 ||
      scalar === ScalarType.SFIXED64 ||
      scalar === ScalarType.UINT64 ||
      scalar === ScalarType.FIXED64
    );
  },

  /** Detects the field-reference form accepted by numeric option declarations.
   * @param value Declared bound text to classify.
   * @returns Whether `value` names another message field.
   */
  looksLikeReference(value: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value);
  },
} as const;
