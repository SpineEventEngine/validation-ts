/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Redistribution and use in source and/or binary forms, with or without
 * modification, must retain the above copyright notice and the following
 * disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Unit tests for `(required)` and `(if_missing)` validation options.
 *
 * Tests the `(required)` option for ensuring fields have non-default values.
 */

import { create } from "@bufbuild/protobuf";

const atLeast = (value: number, minimum: number): void =>
  expect(value)["toBeGreaterThanOrEqual"](minimum);
import { ValidationConfigurationError, validate } from "../src/index.js";

import {
  RequiredFieldsSchema,
  CustomErrorMessagesSchema as RequiredErrorsSchema,
  OptionalFieldsSchema,
  InvalidRequiredNumericSchema,
  InvalidRequiredBooleanSchema,
  Status,
} from "./generated/test-required_pb.js";

describe("Required Field Validation", () => {
  describe("Basic Required Fields", () => {
    it("should validate message with all `required` fields present", () => {
      const valid = create(RequiredFieldsSchema, {
        name: "John Doe",
        age: 30,
        address: { street: "123 Main St", city: "Boston" },
        status: Status.ACTIVE,
        tags: ["tag1"],
        payload: new Uint8Array([1]),
        scores: { a: 1 },
      });

      const violations = validate(RequiredFieldsSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect missing `required` string field", () => {
      const invalid = create(RequiredFieldsSchema, {
        name: "", // Required but empty.
        age: 30,
        address: { street: "123 Main St", city: "Boston" },
        status: Status.ACTIVE,
        tags: ["tag1"],
      });

      const violations = validate(RequiredFieldsSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      const nameViolation = violations.find((v) => v.fieldPath?.fieldName[0] === "name");
      expect(nameViolation).toBeDefined();
      expect(nameViolation?.message?.withPlaceholders).toBe(
        "The field `${parent.type}.${field.path}` of the type `${field.type}` must have a non-default value.",
      );
      expect(nameViolation?.fieldValue).toBeUndefined();
      expect(nameViolation?.message?.placeholderValue).toMatchObject({
        "parent.type": RequiredFieldsSchema.typeName,
        "field.path": "name",
        "field.type": "string",
      });
    });

    it("should detect missing `required` message field", () => {
      const invalid = create(RequiredFieldsSchema, {
        name: "John Doe",
        age: 30,
        address: undefined, // Required but missing.
        status: Status.ACTIVE,
        tags: ["tag1"],
      });

      const violations = validate(RequiredFieldsSchema, invalid);
      const addressViolation = violations.find((v) => v.fieldPath?.fieldName[0] === "address");
      expect(addressViolation).toBeDefined();
    });

    it("should detect empty `required` repeated field", () => {
      const invalid = create(RequiredFieldsSchema, {
        name: "John Doe",
        age: 30,
        address: { street: "123 Main St", city: "Boston" },
        status: Status.ACTIVE,
        tags: [], // Required but empty.
      });

      const violations = validate(RequiredFieldsSchema, invalid);
      const tagsViolation = violations.find((v) => v.fieldPath?.fieldName[0] === "tags");
      expect(tagsViolation).toBeDefined();
    });

    it("should detect multiple missing `required` fields", () => {
      const invalid = create(RequiredFieldsSchema, {
        name: "",
        age: 0,
        address: undefined,
        status: 0,
        tags: [],
      });

      const violations = validate(RequiredFieldsSchema, invalid);
      atLeast(violations.length, 3);
    });
  });

  describe("Custom Error Messages", () => {
    it("should use custom error message from (`if_missing`) option", () => {
      const invalid = create(RequiredErrorsSchema, {
        username: "", // Required with custom message.
        email: "valid@example.com",
      });

      const violations = validate(RequiredErrorsSchema, invalid);
      const usernameViolation = violations.find((v) => v.fieldPath?.fieldName[0] === "username");
      expect(usernameViolation).toBeDefined();
      expect(usernameViolation?.message?.withPlaceholders).toBe(
        "Username is mandatory for account creation.",
      );
    });

    it("should use custom error message for field with custom error message", () => {
      const invalid = create(RequiredErrorsSchema, {
        username: "johndoe",
        email: "", // Required with custom message.
      });

      const violations = validate(RequiredErrorsSchema, invalid);
      const emailViolation = violations.find((v) => v.fieldPath?.fieldName[0] === "email");
      expect(emailViolation).toBeDefined();
      expect(emailViolation?.message?.withPlaceholders).toBe("Email address must be provided.");
    });
  });

  it("requires non-empty bytes and maps with field-only paths", () => {
    const violations = validate(
      RequiredFieldsSchema,
      create(RequiredFieldsSchema, {
        name: "name",
        address: { street: "street" },
        status: Status.ACTIVE,
        tags: ["tag"],
        payload: new Uint8Array(),
        scores: {},
      }),
    );
    expect(violations.map((v) => v.fieldPath?.fieldName)).toEqual([["payload"], ["scores"]]);
    for (const violation of violations) {
      expect(violation.fieldValue).toBeUndefined();
      expect(violation.message?.placeholderValue).toMatchObject({
        "parent.type": RequiredFieldsSchema.typeName,
        "field.path": violation.fieldPath?.fieldName[0],
      });
    }
    expect(
      validate(
        RequiredFieldsSchema,
        create(RequiredFieldsSchema, {
          name: "name",
          address: { street: "street" },
          status: Status.ACTIVE,
          tags: ["tag"],
          payload: new Uint8Array([1]),
          scores: { a: 1 },
        }),
      ),
    ).toHaveLength(0);
  });

  describe("Optional Fields", () => {
    it("should not validate optional fields when empty", () => {
      const valid = create(OptionalFieldsSchema, {
        nickname: "",
        score: 0,
      });

      const violations = validate(OptionalFieldsSchema, valid);
      expect(violations).toHaveLength(0);
    });
  });

  it("rejects numeric `(required)` targets before validating values", () => {
    expect(() =>
      validate(InvalidRequiredNumericSchema, create(InvalidRequiredNumericSchema)),
    ).toThrow(ValidationConfigurationError);
    expect(() =>
      validate(InvalidRequiredNumericSchema, create(InvalidRequiredNumericSchema)),
    ).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_OPTION_TARGET",
        option: "required",
        typeName: InvalidRequiredNumericSchema.typeName,
        fieldPath: ["age"],
      }),
    );
  });

  it("rejects boolean `(required)` targets", () => {
    expect(() =>
      validate(InvalidRequiredBooleanSchema, create(InvalidRequiredBooleanSchema)),
    ).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_OPTION_TARGET",
        option: "required",
        typeName: InvalidRequiredBooleanSchema.typeName,
        fieldPath: ["enabled"],
      }),
    );
  });
});
