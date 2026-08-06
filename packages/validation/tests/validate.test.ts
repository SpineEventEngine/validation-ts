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
 * Unit tests for `(validate)` and `(if_invalid)` validation options.
 *
 * Tests recursive validation of nested message fields.
 */

import { create } from "@bufbuild/protobuf";
import { anyPack, AnySchema } from "@bufbuild/protobuf/wkt";
import { ValidationConfigurationError, validate } from "../src/index.js";

import {
  PersonWithAddressSchema,
  AddressSchema,
  OrderWithCustomErrorSchema as OrderCustomErrorSchema,
  CustomerSchema,
  TeamWithMembersSchema,
  MemberSchema,
  CompanyStructureSchema,
  DepartmentSchema,
  ManagerSchema,
  ProfileWithOptionalDataSchema as ProfileOptionalDataSchema,
  OptionalDataSchema as ValidateOptionalDataSchema,
  PersonWithoutValidationSchema,
  ProductOrderSchema,
  ProductDetailsSchema,
  ReviewSchema,
  ShippingInfoSchema,
  ContainerWithEmptyMessageSchema as ContainerEmptyMessageSchema,
  EmptyValidatedSchema,
  ProjectWithTasksSchema,
  TaskSchema,
  LeafSchema,
  NestedValidationContainersSchema,
  ValidateDisabledSchema,
  ValidateUnsupportedTargetSchema,
  NestedMessageOptionContainersSchema as NestedOptionContainersSchema,
  RequireLeafSchema,
  ChoiceLeafSchema,
} from "./generated/test-validate_pb.js";
import { UserIdentifierSchema } from "./generated/test-required-field_pb.js";

describe("Nested Message Validation (validate)", () => {
  describe("Basic Nested Validation", () => {
    it("should pass when nested message is valid", () => {
      const valid = create(PersonWithAddressSchema, {
        name: "John Doe",
        address: create(AddressSchema, {
          street: "123 Main St",
          city: "Boston",
          zipCode: "02101",
        }),
      });

      const violations = validate(PersonWithAddressSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should fail when nested message violates constraints", () => {
      const invalid = create(PersonWithAddressSchema, {
        name: "John Doe",
        address: create(AddressSchema, {
          street: "", // Required violation.
          city: "Boston",
          zipCode: "02101",
        }),
      });

      const violations = validate(PersonWithAddressSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      // Should have violation for nested field.
      const nestedViolation = violations.find((v) => v.fieldPath?.fieldName.includes("address"));
      expect(nestedViolation).toBeDefined();
    });

    it("should report violations with correct nested field path", () => {
      const invalid = create(PersonWithAddressSchema, {
        name: "John Doe",
        address: create(AddressSchema, {
          street: "123 Main St",
          city: "", // Required violation.
          zipCode: "02101",
        }),
      });

      const violations = validate(PersonWithAddressSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      // Check for nested field path: `address.city`.
      const cityViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "address" && v.fieldPath?.fieldName[1] === "city",
      );
      expect(cityViolation).toBeDefined();
    });

    it("should `validate` multiple constraints in nested message", () => {
      const invalid = create(PersonWithAddressSchema, {
        name: "John Doe",
        address: create(AddressSchema, {
          street: "123 Main St",
          city: "Boston",
          zipCode: "ABCDE", // Pattern violation (should be 5 digits).
        }),
      });

      const violations = validate(PersonWithAddressSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      const zipViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "address" && v.fieldPath?.fieldName[1] === "zip_code",
      );
      expect(zipViolation).toBeDefined();
    });
  });

  describe("Deprecated parent diagnostics", () => {
    it("does not emit a deprecated parent summary when nested validation fails", () => {
      const invalid = create(OrderCustomErrorSchema, {
        orderId: 123,
        customer: create(CustomerSchema, {
          email: "invalid-email", // Pattern violation.
          age: 25,
        }),
      });

      const violations = validate(OrderCustomErrorSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      expect(violations).toHaveLength(1);
      expect(violations[0].fieldPath?.fieldName).toEqual(["customer", "email"]);
    });

    it("propagates only leaves when multiple nested constraints fail", () => {
      const invalid = create(OrderCustomErrorSchema, {
        orderId: 123,
        customer: create(CustomerSchema, {
          email: "invalid-email",
          age: 15, // Violates range [18..120].
        }),
      });

      const violations = validate(OrderCustomErrorSchema, invalid);
      expect(violations).toHaveLength(2);
      const emailViolation = violations.find((v) => v.fieldPath?.fieldName[1] === "email");
      expect(emailViolation).toBeDefined();

      const ageViolation = violations.find((v) => v.fieldPath?.fieldName[1] === "age");
      expect(ageViolation).toBeDefined();
    });
  });

  describe("Repeated Message Fields", () => {
    it("should `validate` all elements in repeated message field", () => {
      const valid = create(TeamWithMembersSchema, {
        teamName: "Engineering",
        members: [
          create(MemberSchema, { name: "Alice", email: "alice@example.com" }),
          create(MemberSchema, { name: "Bob", email: "bob@example.com" }),
        ],
      });

      const violations = validate(TeamWithMembersSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect violation in one member", () => {
      const invalid = create(TeamWithMembersSchema, {
        teamName: "Engineering",
        members: [
          create(MemberSchema, { name: "Alice", email: "alice@example.com" }),
          create(MemberSchema, { name: "", email: "bob@example.com" }), // Name required.
        ],
      });

      const violations = validate(TeamWithMembersSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      // Check for violation at `members.name`; collection indexes are not field names.
      const nameViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "members" && v.fieldPath?.fieldName[1] === "name",
      );
      expect(nameViolation).toBeDefined();
    });

    it("should detect violations in multiple members", () => {
      const invalid = create(TeamWithMembersSchema, {
        teamName: "Engineering",
        members: [
          create(MemberSchema, { name: "", email: "alice@example.com" }), // Name violation.
          create(MemberSchema, { name: "Bob", email: "invalid" }), // Email violation.
        ],
      });

      const violations = validate(TeamWithMembersSchema, invalid);
      expect(violations).toHaveLength(2);
    });
  });

  describe("Deeply Nested Validation", () => {
    it("should `validate` multiple levels of nesting", () => {
      const valid = create(CompanyStructureSchema, {
        companyName: "Tech Corp",
        department: create(DepartmentSchema, {
          deptName: "Engineering",
          manager: create(ManagerSchema, {
            name: "Jane Smith",
            email: "jane@techcorp.com",
          }),
        }),
      });

      const violations = validate(CompanyStructureSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect violations in deeply nested messages", () => {
      const invalid = create(CompanyStructureSchema, {
        companyName: "Tech Corp",
        department: create(DepartmentSchema, {
          deptName: "Engineering",
          manager: create(ManagerSchema, {
            name: "", // Required violation.
            email: "jane@techcorp.com",
          }),
        }),
      });

      const violations = validate(CompanyStructureSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      // Check for nested path: `department.manager.name`.
      const deepViolation = violations.find(
        (v) =>
          v.fieldPath?.fieldName[0] === "department" &&
          v.fieldPath?.fieldName[1] === "manager" &&
          v.fieldPath?.fieldName[2] === "name",
      );
      expect(deepViolation).toBeDefined();
    });
  });

  describe("Optional Nested Fields", () => {
    it("should pass when optional nested field is not set", () => {
      const valid = create(ProfileOptionalDataSchema, {
        username: "johndoe",
        // `optional_data` not set.
      });

      const violations = validate(ProfileOptionalDataSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should `validate` when optional nested field is set", () => {
      const valid = create(ProfileOptionalDataSchema, {
        username: "johndoe",
        optionalData: create(ValidateOptionalDataSchema, {
          bio: "Software engineer",
          followers: 100,
        }),
      });

      const violations = validate(ProfileOptionalDataSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect violations in optional nested field when set", () => {
      const invalid = create(ProfileOptionalDataSchema, {
        username: "johndoe",
        optionalData: create(ValidateOptionalDataSchema, {
          bio: "Software engineer",
          followers: -5, // Violates min = 0.
        }),
      });

      const violations = validate(ProfileOptionalDataSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe("Without Validate Option (Control Group)", () => {
    it("should not `validate` nested message without (`validate`) = true", () => {
      const invalid = create(PersonWithoutValidationSchema, {
        name: "John Doe",
        address: create(AddressSchema, {
          street: "", // Would violate required, but not validated.
          city: "", // Would violate required, but not validated.
          zipCode: "", // Would violate required, but not validated.
        }),
      });

      const violations = validate(PersonWithoutValidationSchema, invalid);
      expect(violations).toHaveLength(0); // No violations because validate is not enabled.
    });
  });

  describe("Complex Combined Validation", () => {
    it("should `validate` complex message with multiple nested fields", () => {
      const valid = create(ProductOrderSchema, {
        productId: 123,
        product: create(ProductDetailsSchema, {
          name: "Widget",
          price: 19.99,
          tags: ["electronics", "gadget"],
        }),
        reviews: [
          create(ReviewSchema, { rating: 5, comment: "Great!" }),
          create(ReviewSchema, { rating: 4, comment: "Good" }),
        ],
        shipping: create(ShippingInfoSchema, {
          address: create(AddressSchema, {
            street: "123 Main St",
            city: "Boston",
            zipCode: "02101",
          }),
          method: "Express",
        }),
      });

      const violations = validate(ProductOrderSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect `distinct` violation in nested product", () => {
      const invalid = create(ProductOrderSchema, {
        productId: 123,
        product: create(ProductDetailsSchema, {
          name: "Widget",
          price: 19.99,
          tags: ["electronics", "gadget", "electronics"], // Duplicate tag.
        }),
        reviews: [],
        shipping: create(ShippingInfoSchema, {
          address: create(AddressSchema, {
            street: "123 Main St",
            city: "Boston",
            zipCode: "02101",
          }),
          method: "Express",
        }),
      });

      const violations = validate(ProductOrderSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      const tagsViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "product" && v.fieldPath?.fieldName[1] === "tags",
      );
      expect(tagsViolation).toBeDefined();
    });

    it("should detect violations in repeated reviews", () => {
      const invalid = create(ProductOrderSchema, {
        productId: 123,
        product: create(ProductDetailsSchema, {
          name: "Widget",
          price: 19.99,
          tags: ["electronics"],
        }),
        reviews: [
          create(ReviewSchema, { rating: 5, comment: "Great!" }),
          create(ReviewSchema, { rating: 6, comment: "Good" }), // Rating out of range.
        ],
        shipping: create(ShippingInfoSchema, {
          address: create(AddressSchema, {
            street: "123 Main St",
            city: "Boston",
            zipCode: "02101",
          }),
          method: "Express",
        }),
      });

      const violations = validate(ProductOrderSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      const ratingViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "reviews" && v.fieldPath?.fieldName[1] === "rating",
      );
      expect(ratingViolation).toBeDefined();
    });

    it("should detect violations in doubly-nested shipping address", () => {
      const invalid = create(ProductOrderSchema, {
        productId: 123,
        product: create(ProductDetailsSchema, {
          name: "Widget",
          price: 19.99,
          tags: ["electronics"],
        }),
        reviews: [],
        shipping: create(ShippingInfoSchema, {
          address: create(AddressSchema, {
            street: "123 Main St",
            city: "Boston",
            zipCode: "INVALID", // Pattern violation.
          }),
          method: "Express",
        }),
      });

      const violations = validate(ProductOrderSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      // Path: `shipping.address.zip_code`.
      const zipViolation = violations.find(
        (v) =>
          v.fieldPath?.fieldName[0] === "shipping" &&
          v.fieldPath?.fieldName[1] === "address" &&
          v.fieldPath?.fieldName[2] === "zip_code",
      );
      expect(zipViolation).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should pass when validating message with no constraints", () => {
      const valid = create(ContainerEmptyMessageSchema, {
        id: "test-123",
        empty: create(EmptyValidatedSchema, {
          note: "Some note",
        }),
      });

      const violations = validate(ContainerEmptyMessageSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should `validate` nested message with its own nested validation", () => {
      const valid = create(ProjectWithTasksSchema, {
        projectName: "Project Alpha",
        tasks: [
          create(TaskSchema, {
            title: "Task 1",
            priority: 3,
            assignees: ["alice", "bob"],
          }),
        ],
        tags: ["urgent", "backend"],
      });

      const violations = validate(ProjectWithTasksSchema, valid);
      expect(violations).toHaveLength(0);
    });

    it("should detect `distinct` violation in nested task assignees", () => {
      const invalid = create(ProjectWithTasksSchema, {
        projectName: "Project Alpha",
        tasks: [
          create(TaskSchema, {
            title: "Task 1",
            priority: 3,
            assignees: ["alice", "bob", "alice"], // Duplicate assignee.
          }),
        ],
        tags: ["urgent", "backend"],
      });

      const violations = validate(ProjectWithTasksSchema, invalid);
      expect(violations.length).toBeGreaterThan(0);

      const assigneeViolation = violations.find(
        (v) => v.fieldPath?.fieldName[0] === "tasks" && v.fieldPath?.fieldName[1] === "assignees",
      );
      expect(assigneeViolation).toBeDefined();
    });
  });

  describe("Task 6 nested validation contract", () => {
    it("keeps the root type and leaf envelope through singular, repeated, and map values", () => {
      const invalid = create(NestedValidationContainersSchema, {
        singular: create(LeafSchema, { value: "set", quantity: 0 }),
        repeated: [create(LeafSchema, { value: "" })],
        mapped: { first: create(LeafSchema, { value: "" }) },
      });

      const violations = validate(NestedValidationContainersSchema, invalid);
      expect(violations).toHaveLength(5);
      expect(violations.map((violation) => violation.typeName)).toEqual([
        NestedValidationContainersSchema.typeName,
        NestedValidationContainersSchema.typeName,
        NestedValidationContainersSchema.typeName,
        NestedValidationContainersSchema.typeName,
        NestedValidationContainersSchema.typeName,
      ]);
      expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
        ["singular", "quantity"],
        ["repeated", "value"],
        ["repeated", "quantity"],
        ["mapped", "value"],
        ["mapped", "quantity"],
      ]);
      expect(violations[0].fieldValue?.typeUrl).toContain("google.protobuf.Int32Value");
    });

    it("skips the singular default message but validates explicit default collection values", () => {
      const valid = create(NestedValidationContainersSchema, {
        singular: create(LeafSchema),
      });
      expect(validate(NestedValidationContainersSchema, valid)).toHaveLength(0);

      const invalid = create(NestedValidationContainersSchema, {
        repeated: [create(LeafSchema)],
        mapped: { default: create(LeafSchema) },
      });
      expect(validate(NestedValidationContainersSchema, invalid)).toHaveLength(4);
    });

    it("unpacks known Any values and leaves empty or unknown Any values valid", () => {
      const invalidLeaf = create(LeafSchema, { value: "" });
      const validLeaf = create(LeafSchema, { value: "set", quantity: 1 });
      const result = validate(
        NestedValidationContainersSchema,
        create(NestedValidationContainersSchema, {
          packed: anyPack(LeafSchema, invalidLeaf),
          packedRepeated: [anyPack(LeafSchema, validLeaf)],
          packedMapped: { invalid: anyPack(LeafSchema, invalidLeaf) },
        }),
      );
      expect(result.map((violation) => violation.fieldPath?.fieldName)).toEqual([
        ["packed", "value"],
        ["packed", "quantity"],
        ["packed_mapped", "value"],
        ["packed_mapped", "quantity"],
      ]);
      const packedQuantity = result.find(
        (violation) => violation.fieldPath?.fieldName.join(".") === "packed.quantity",
      );
      expect(packedQuantity?.fieldValue?.typeUrl).toContain("google.protobuf.Int32Value");
      expect(packedQuantity?.message?.withPlaceholders).toContain("${min.value}");

      expect(
        validate(
          NestedValidationContainersSchema,
          create(NestedValidationContainersSchema, {
            packed: { typeUrl: "type.googleapis.com/example.Unknown", value: new Uint8Array([1]) },
          }),
        ),
      ).toHaveLength(0);

      expect(
        validate(
          NestedValidationContainersSchema,
          create(NestedValidationContainersSchema, {
            packed: create(AnySchema),
            packedRepeated: [create(AnySchema)],
            packedMapped: { empty: create(AnySchema) },
          }),
        ),
      ).toHaveLength(0);

      expect(
        validate(
          NestedValidationContainersSchema,
          create(NestedValidationContainersSchema, {
            packed: anyPack(UserIdentifierSchema, create(UserIdentifierSchema)),
          }),
        ),
      ).toHaveLength(0);
    });

    it("prefixes nested message-level require and choice violations", () => {
      const violations = validate(
        NestedOptionContainersSchema,
        create(NestedOptionContainersSchema, {
          requireChild: create(RequireLeafSchema, { marker: "set" }),
          choiceChild: create(ChoiceLeafSchema, { marker: "set" }),
        }),
      );
      expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
        ["require_child"],
        ["choice_child"],
      ]);
      expect(violations.map((violation) => violation.typeName)).toEqual([
        NestedOptionContainersSchema.typeName,
        NestedOptionContainersSchema.typeName,
      ]);
    });

    it("treats false as a no-op and rejects unsupported true targets", () => {
      expect(
        validate(
          ValidateDisabledSchema,
          create(ValidateDisabledSchema, { leaf: create(LeafSchema) }),
        ),
      ).toHaveLength(0);
      expect(() =>
        validate(ValidateUnsupportedTargetSchema, create(ValidateUnsupportedTargetSchema)),
      ).toThrow(ValidationConfigurationError);
      try {
        validate(ValidateUnsupportedTargetSchema, create(ValidateUnsupportedTargetSchema));
      } catch (error) {
        expect(error).toMatchObject({
          code: "UNSUPPORTED_OPTION_TARGET",
          option: "validate",
          typeName: ValidateUnsupportedTargetSchema.typeName,
          fieldPath: ["value"],
        });
      }
    });
  });
});
