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

import { create } from "@bufbuild/protobuf";

import { validate } from "../src/index.js";
import {
  NumericBoundsContractSchema,
  NumericReferencesSchema,
  InvalidMinSuffixSchema,
  InvalidMinFloatSchema,
  InvalidMinUnsignedSchema,
  InvalidMinTargetSchema,
  MissingNumericReferenceSchema,
  IncompatibleNumericReferenceSchema,
  NumericScalarMatrixSchema,
  CrossTypeReferencesSchema,
  InvalidInt32OverflowSchema,
  InvalidUint32OverflowSchema,
  InvalidInt64OverflowSchema,
  InvalidUint64OverflowSchema,
  InvalidUint64NegativeSchema,
  InvalidIntegerDecimalSchema,
  InvalidFloatExponentSchema,
  InvalidFloatOverflowSchema,
  InvalidDoubleOverflowSchema,
  NumericTypesSchema,
  RepeatedMinMaxSchema,
} from "./generated/test-min-max_pb.js";
import {
  ExactLongRangesSchema,
  InvalidRangeTargetSchema,
  MalformedRangeSchema,
  RangeTextReferencesSchema,
  ReversedRangeSchema,
  NumericTypeRangesSchema,
  RepeatedRangeSchema,
} from "./generated/test-range_pb.js";

describe("exact numeric validation contract", () => {
  it("keeps 64-bit integer bounds exact and packs a repeated offending value", () => {
    const exactValues = 9007199254740993n;
    expect(
      validate(
        NumericBoundsContractSchema,
        create(NumericBoundsContractSchema, {
          preciseMin: exactValues,
          preciseMax: exactValues,
          repeatedPrecise: [exactValues],
        }),
      ),
    ).toEqual([]);

    const violations = validate(
      NumericBoundsContractSchema,
      create(NumericBoundsContractSchema, {
        preciseMin: 9007199254740992n,
        preciseMax: 9007199254740994n,
        repeatedPrecise: [9007199254740992n, 9007199254740993n],
      }),
    );
    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["precise_min"],
      ["precise_max"],
      ["repeated_precise"],
    ]);
    expect(violations[2].fieldValue?.typeUrl).toContain("google.protobuf.Int64Value");
  });

  it.each([
    [InvalidMinSuffixSchema, "INVALID_OPTION_VALUE"],
    [InvalidMinFloatSchema, "INVALID_OPTION_VALUE"],
    [InvalidMinUnsignedSchema, "INVALID_OPTION_VALUE"],
    [InvalidMinTargetSchema, "UNSUPPORTED_OPTION_TARGET"],
  ])("rejects invalid min configuration", (schema, code) => {
    expect(() => validate(schema as any, create(schema as any))).toThrow(
      expect.objectContaining({
        code,
        option: "min",
        typeName: schema.typeName,
        fieldPath: ["value"],
      }),
    );
  });

  it.each([
    [InvalidInt32OverflowSchema, "min"],
    [InvalidUint32OverflowSchema, "max"],
    [InvalidInt64OverflowSchema, "min"],
    [InvalidUint64OverflowSchema, "max"],
    [InvalidUint64NegativeSchema, "min"],
    [InvalidIntegerDecimalSchema, "min"],
    [InvalidFloatExponentSchema, "min"],
    [InvalidFloatOverflowSchema, "min"],
    [InvalidDoubleOverflowSchema, "min"],
  ])("rejects scalar limit and complete-grammar errors", (schema, option) => {
    expect(() => validate(schema as any, create(schema as any))).toThrow(
      expect.objectContaining({
        code: "INVALID_OPTION_VALUE",
        option,
        typeName: schema.typeName,
        fieldPath: ["value"],
      }),
    );
  });

  it("uses default nested-message values for a referenced bound and renders it", () => {
    const violations = validate(
      NumericReferencesSchema,
      create(NumericReferencesSchema, { actual: -1n, measured: 1 }),
    );
    expect(violations).toHaveLength(2);
    expect(violations[0].message?.placeholderValue["min.value"]).toBe("limits.lower (0)");
  });

  it.each([
    [MissingNumericReferenceSchema, "UNKNOWN_FIELD_REFERENCE"],
    [IncompatibleNumericReferenceSchema, "INVALID_FIELD_REFERENCE"],
  ])("reports reference errors", (schema, code) => {
    expect(() => validate(schema as any, create(schema as any))).toThrow(
      expect.objectContaining({
        code,
        option: "min",
        typeName: schema.typeName,
        fieldPath: ["value"],
      }),
    );
  });

  it("compares referenced numeric fields across runtime scalar types", () => {
    const violations = validate(
      CrossTypeReferencesSchema,
      create(CrossTypeReferencesSchema, {
        doubleBound: 1.5,
        int64Bound: 3n,
        integerValue: 1n,
        floatingValue: 3.5,
      }),
    );
    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["integer_value"],
      ["floating_value"],
    ]);
    expect(violations[0].message?.placeholderValue["min.value"]).toBe("double_bound (1.5)");
    expect(violations[1].message?.placeholderValue["max.value"]).toBe("int64_bound (3)");
  });

  it("executes all remaining signed and fixed scalar families", () => {
    const violations = validate(
      NumericScalarMatrixSchema,
      create(NumericScalarMatrixSchema, {
        sint32Value: -2,
        sint64Value: 9007199254740994n,
        fixed32Value: 0,
        fixed64Value: 9007199254740994n,
        sfixed32Value: -2,
        sfixed64Value: 9007199254740994n,
      }),
    );
    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["sint32_value"],
      ["sint64_value"],
      ["fixed32_value"],
      ["fixed64_value"],
      ["sfixed32_value"],
      ["sfixed64_value"],
    ]);
  });

  it.each([
    [ReversedRangeSchema, "INVALID_OPTION_VALUE"],
    [MalformedRangeSchema, "INVALID_OPTION_VALUE"],
    [InvalidRangeTargetSchema, "UNSUPPORTED_OPTION_TARGET"],
  ])("rejects invalid range declarations", (schema, code) => {
    expect(() => validate(schema as any, create(schema as any))).toThrow(
      expect.objectContaining({
        code,
        option: "range",
        typeName: schema.typeName,
        fieldPath: ["value"],
      }),
    );
  });

  it("preserves exact range declaration text while annotating references", () => {
    const violations = validate(
      RangeTextReferencesSchema,
      create(RangeTextReferencesSchema, { value: 1, literal: 0 }),
    );
    expect(
      violations.map((violation) => violation.message?.placeholderValue["range.value"]),
    ).toEqual(["[ -1 .. limits.upper (0) ]", "[ 1 .. 2 ]"]);
  });

  it("keeps signed and unsigned 64-bit range endpoints exact", () => {
    const violations = validate(
      ExactLongRangesSchema,
      create(ExactLongRangesSchema, {
        signedValue: 9007199254740992n,
        unsignedValue: 9007199254740996n,
      }),
    );
    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["signed_value"],
      ["unsigned_value"],
    ]);
    expect(
      violations.every(
        (violation) =>
          violation.fieldValue?.typeUrl.endsWith("Int64Value") ||
          violation.fieldValue?.typeUrl.endsWith("UInt64Value"),
      ),
    ).toBe(true);
  });

  it("rejects NaN for singular min, max, and range constraints", () => {
    const minAndMax = validate(
      NumericTypesSchema,
      create(NumericTypesSchema, {
        uint64Field: 1n,
        floatField: Number.NaN,
        doubleField: Number.NaN,
      }),
    );
    const ranged = validate(
      NumericTypeRangesSchema,
      create(NumericTypeRangesSchema, {
        int32Field: 1,
        int64Field: 0n,
        uint32Field: 1,
        uint64Field: 1n,
        floatField: Number.NaN,
        doubleField: Number.NaN,
      }),
    );

    expect(minAndMax.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["float_field"],
      ["float_field"],
      ["double_field"],
      ["double_field"],
    ]);
    expect(ranged.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["float_field"],
      ["double_field"],
    ]);
  });

  it("rejects NaN in repeated numeric values", () => {
    const minViolations = validate(
      RepeatedMinMaxSchema,
      create(RepeatedMinMaxSchema, {
        prices: [Number.NaN],
        measurements: [Number.NaN],
      }),
    );
    const rangeViolations = validate(
      RepeatedRangeSchema,
      create(RepeatedRangeSchema, { percentages: [Number.NaN] }),
    );

    expect(minViolations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["prices"],
      ["measurements"],
      ["measurements"],
    ]);
    expect(rangeViolations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["percentages"],
    ]);
  });

  it("keeps Infinity subject to its numeric bounds", () => {
    const violations = validate(
      NumericTypesSchema,
      create(NumericTypesSchema, {
        uint64Field: 1n,
        floatField: Number.POSITIVE_INFINITY,
        doubleField: Number.NEGATIVE_INFINITY,
      }),
    );

    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["float_field"],
      ["double_field"],
    ]);
    expect(
      violations.map((violation) => violation.message?.placeholderValue["max.operator"]),
    ).toEqual(["<=", undefined]);
    expect(violations[1].message?.placeholderValue["min.operator"]).toBe(">=");
  });
});
