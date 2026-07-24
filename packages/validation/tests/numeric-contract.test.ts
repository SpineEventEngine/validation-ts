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
} from "./generated/test-min-max_pb";
import {
  InvalidRangeTargetSchema,
  MalformedRangeSchema,
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
      expect.objectContaining({ code, option: "min" }),
    );
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
});
