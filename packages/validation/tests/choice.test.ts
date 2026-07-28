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

import { create } from "@bufbuild/protobuf";
import { validate } from "../src/validation.js";
import {
  PaymentMethodSchema,
  ContactMethodSchema,
  ShippingOptionSchema,
  MultipleRequiredChoicesSchema,
} from "./generated/test-choice_pb.js";

describe("Choice Option Validation (oneof)", () => {
  describe("Basic Choice Validation", () => {
    it("should pass when one field in oneof is set", () => {
      const payment = create(PaymentMethodSchema, {
        method: {
          case: "creditCard",
          value: "4111111111111111",
        },
      });

      const violations = validate(PaymentMethodSchema, payment);
      expect(violations).toHaveLength(0);
    });

    it("should fail when no field in required oneof is set", () => {
      const payment = create(PaymentMethodSchema, {
        // method `oneof` not set
      });

      const violations = validate(PaymentMethodSchema, payment);
      expect(violations.length).toBeGreaterThan(0);

      const choiceViolation = violations[0];
      expect(choiceViolation).toBeDefined();
      expect(choiceViolation?.fieldPath?.fieldName).toEqual([]);
      expect(choiceViolation?.message?.placeholderValue?.["group.path"]).toBe("method");
      expect(choiceViolation?.message?.withPlaceholders).toContain("oneof");
    });

    it("should pass when different field in oneof is set", () => {
      const payment = create(PaymentMethodSchema, {
        method: {
          case: "bankAccount",
          value: "123456789",
        },
      });

      const violations = validate(PaymentMethodSchema, payment);
      expect(violations).toHaveLength(0);
    });

    it("treats selected numeric zero and boolean false cases as present", () => {
      const numeric = create(MultipleRequiredChoicesSchema, {
        first: { case: "count", value: 0 },
        second: { case: "enabled", value: false },
      });
      expect(validate(MultipleRequiredChoicesSchema, numeric)).toHaveLength(0);
    });
  });

  describe("Custom Error Messages", () => {
    it("should use custom error message when provided", () => {
      const contact = create(ContactMethodSchema, {
        // contact `oneof` not set, has custom error message
      });

      const violations = validate(ContactMethodSchema, contact);
      expect(violations.length).toBeGreaterThan(0);

      const choiceViolation = violations[0];
      expect(choiceViolation).toBeDefined();
      expect(choiceViolation?.fieldPath?.fieldName).toEqual([]);
      expect(choiceViolation?.message?.placeholderValue?.["group.path"]).toBe("contact");
      expect(choiceViolation?.message?.withPlaceholders).toContain("must provide a contact method");
    });
  });

  describe("Optional Oneofs", () => {
    it("should pass when optional oneof is not set", () => {
      const shipping = create(ShippingOptionSchema, {
        // delivery `oneof` is optional (choice.required = false)
      });

      const violations = validate(ShippingOptionSchema, shipping);
      expect(violations).toHaveLength(0);
    });

    it("should pass when optional oneof has a field set", () => {
      const shipping = create(ShippingOptionSchema, {
        delivery: {
          case: "standard",
          value: true,
        },
      });

      const violations = validate(ShippingOptionSchema, shipping);
      expect(violations).toHaveLength(0);
    });
  });

  describe("Multiple Oneofs in Same Message", () => {
    it("emits one message-level violation per unset group in declaration order", () => {
      const violations = validate(
        MultipleRequiredChoicesSchema,
        create(MultipleRequiredChoicesSchema),
      );
      expect(violations).toHaveLength(2);
      expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([[], []]);
      expect(
        violations.map((violation) => violation.message?.placeholderValue["group.path"]),
      ).toEqual(["first", "second"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle message with no oneofs", () => {
      // Most messages don't have oneofs, should not cause errors
      const payment = create(PaymentMethodSchema, {
        method: {
          case: "creditCard",
          value: "4111111111111111",
        },
      });

      const violations = validate(PaymentMethodSchema, payment);
      expect(violations).toHaveLength(0);
    });

    it("should provide clear field path in violation", () => {
      const payment = create(PaymentMethodSchema, {});

      const violations = validate(PaymentMethodSchema, payment);
      const choiceViolation = violations[0];

      expect(choiceViolation?.fieldPath?.fieldName).toEqual([]);
      expect(choiceViolation?.message?.placeholderValue?.["group.path"]).toBe("method");
      expect(choiceViolation?.typeName).toBe("test.PaymentMethod");
    });
  });
});
