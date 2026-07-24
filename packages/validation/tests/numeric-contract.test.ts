/*
 * Copyright 2026, TeamDev. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { create } from "@bufbuild/protobuf";

import { validate } from "../src";
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
} from "./generated/test-min-max_pb";
import {
  ExactLongRangesSchema,
  InvalidRangeTargetSchema,
  MalformedRangeSchema,
  RangeTextReferencesSchema,
  ReversedRangeSchema,
} from "./generated/test-range_pb";

describe("exact numeric validation contract", () => {
  it("keeps 64-bit integer bounds exact and packs a repeated offending value", () => {
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
});
