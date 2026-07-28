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
import {
  anyUnpack,
  BytesValueSchema,
  Int32ValueSchema,
  StringValueSchema,
} from "@bufbuild/protobuf/wkt";
import { formatTemplateString, ValidationConfigurationError } from "../src.js";
import { createConstraintViolation, createValidationContext } from "../src/validation-contract.js";
import { appendMessageViolation, legacyFieldValidator } from "../src/orchestration.js";
import { ConstraintViolationSchema } from "../src/generated/spine/validate/validation_error_pb.js";
import { TemplateStringSchema } from "../src/generated/spine/validate/error_message_pb.js";
import { AddressSchema, RequiredFieldsSchema, Status } from "./generated/test-required_pb.js";

describe("ValidationConfigurationError", () => {
  it("exposes stable public diagnostic properties", () => {
    const cause = new Error("unknown field");
    const error = new ValidationConfigurationError({
      code: "UNKNOWN_FIELD_REFERENCE",
      option: "min",
      typeName: "example.Measurement",
      fieldPath: ["reading", "minimum"],
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("UNKNOWN_FIELD_REFERENCE");
    expect(error.option).toBe("min");
    expect(error.typeName).toBe("example.Measurement");
    expect(error.fieldPath).toEqual(["reading", "minimum"]);
    expect(error.cause).toBe(cause);
  });
});

describe("validation contract kernel", () => {
  it("formats only literal placeholder tokens and preserves dollar-valued replacements", () => {
    expect(
      formatTemplateString(
        create(TemplateStringSchema, {
          withPlaceholders: "${field.value}; ${fieldXvalue}; ${field.value.extra}; ${other}",
          placeholderValue: {
            "field.value": "$& $1 $$",
            other: "done",
          },
        }),
      ),
    ).toBe("$& $1 $$; ${fieldXvalue}; ${field.value.extra}; done");
  });

  it("normalizes legacy nested, repeated, and map diagnostics through the common envelope", () => {
    const message = create(RequiredFieldsSchema, {
      name: "Ada",
      tags: ["duplicate"],
      scores: { primary: 7 },
    });
    const violations = [] as ReturnType<typeof createConstraintViolation>[];
    const context = createValidationContext(RequiredFieldsSchema);
    const adapter = legacyFieldValidator((_schema, _message, output) => {
      output.push(
        create(ConstraintViolationSchema, {
          fieldPath: { fieldName: ["tags", "0", "nested"] },
          message: { withPlaceholders: "Legacy list diagnostic." },
        }),
      );
    });

    adapter.validate(
      context,
      RequiredFieldsSchema,
      message,
      RequiredFieldsSchema.field.tags,
      violations,
      undefined as never,
    );
    expect(violations[0]).toEqual(
      expect.objectContaining({
        typeName: RequiredFieldsSchema.typeName,
        fieldPath: expect.objectContaining({ fieldName: ["tags", "nested"] }),
        message: expect.objectContaining({ withPlaceholders: "Legacy list diagnostic." }),
      }),
    );
    expect(anyUnpack(violations[0].fieldValue!, StringValueSchema)?.value).toBe("duplicate");

    const mapAdapter = legacyFieldValidator((_schema, _message, output) => {
      output.push(
        create(ConstraintViolationSchema, {
          fieldPath: { fieldName: ["scores", "primary", "nested"] },
        }),
      );
    });
    mapAdapter.validate(
      context,
      RequiredFieldsSchema,
      message,
      RequiredFieldsSchema.field.scores,
      violations,
      undefined as never,
    );
    expect(violations[1].fieldPath?.fieldName).toEqual(["scores", "nested"]);
    expect(anyUnpack(violations[1].fieldValue!, Int32ValueSchema)?.value).toBe(7);
  });

  it("normalizes legacy message-level diagnostics without inventing a field value", () => {
    const violations = [] as ReturnType<typeof createConstraintViolation>[];
    appendMessageViolation(
      createValidationContext(RequiredFieldsSchema),
      create(ConstraintViolationSchema, {
        message: { withPlaceholders: "Legacy message diagnostic." },
      }),
      violations,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].typeName).toBe(RequiredFieldsSchema.typeName);
    expect(violations[0].fieldPath?.fieldName).toEqual([]);
    expect(violations[0].fieldValue).toBeUndefined();
  });

  it("keeps the root type and Proto field path while packing a primitive value", () => {
    const field = RequiredFieldsSchema.field.name;
    const context = createValidationContext(RequiredFieldsSchema).atField(field);
    const violation = createConstraintViolation(context, field, "not-empty", {
      defaultMessage: "Default `${parent.type}.${field.path}`: `${field.value}`.",
    });

    expect(context.rootTypeName).toBe(RequiredFieldsSchema.typeName);
    expect(context.fieldPath).toEqual(["name"]);
    expect(violation.typeName).toBe(RequiredFieldsSchema.typeName);
    expect(violation.fieldPath?.fieldName).toEqual(["name"]);
    expect(anyUnpack(violation.fieldValue!, StringValueSchema)?.value).toBe("not-empty");
    expect(violation.message).toEqual(
      expect.objectContaining({
        withPlaceholders: "Default `${parent.type}.${field.path}`: `${field.value}`.",
        placeholderValue: expect.objectContaining({
          "parent.type": RequiredFieldsSchema.typeName,
          "field.path": "name",
          "field.value": "not-empty",
        }),
      }),
    );
  });

  it("packs bytes, enum, message, and repeated-element values by descriptor", () => {
    const context = createValidationContext(RequiredFieldsSchema);
    const bytesViolation = createConstraintViolation(
      context.atField(RequiredFieldsSchema.field.payload),
      RequiredFieldsSchema.field.payload,
      new Uint8Array([0xde, 0xad]),
      {},
    );
    const enumViolation = createConstraintViolation(
      context.atField(RequiredFieldsSchema.field.status),
      RequiredFieldsSchema.field.status,
      Status.ACTIVE,
      {},
    );
    const address = create(AddressSchema, { street: "Main", city: "Lisbon" });
    const messageViolation = createConstraintViolation(
      context.atField(RequiredFieldsSchema.field.address),
      RequiredFieldsSchema.field.address,
      address,
      {},
    );
    const elementViolation = createConstraintViolation(
      context.atField(RequiredFieldsSchema.field.tags),
      RequiredFieldsSchema.field.tags,
      "duplicate-tag",
      {},
    );

    expect(anyUnpack(bytesViolation.fieldValue!, BytesValueSchema)?.value).toEqual(
      new Uint8Array([0xde, 0xad]),
    );
    expect(anyUnpack(enumViolation.fieldValue!, Int32ValueSchema)?.value).toBe(Status.ACTIVE);
    expect(anyUnpack(messageViolation.fieldValue!, AddressSchema)).toEqual(address);
    expect(anyUnpack(elementViolation.fieldValue!, StringValueSchema)?.value).toBe("duplicate-tag");
  });

  it("resolves custom, default, and empty template strings", () => {
    const context = createValidationContext(RequiredFieldsSchema).atField(
      RequiredFieldsSchema.field.name,
    );

    expect(
      createConstraintViolation(context, RequiredFieldsSchema.field.name, "value", {
        customMessage: "Custom diagnostic.",
        defaultMessage: "Default diagnostic.",
      }).message?.withPlaceholders,
    ).toBe("Custom diagnostic.");
    expect(
      createConstraintViolation(context, RequiredFieldsSchema.field.name, "value", {
        defaultMessage: "Default diagnostic.",
      }).message?.withPlaceholders,
    ).toBe("Default diagnostic.");
    expect(
      createConstraintViolation(context, RequiredFieldsSchema.field.name, "value", {}).message
        ?.withPlaceholders,
    ).toBe("");
  });

  it("creates a message-level violation without a field value", () => {
    const context = createValidationContext(RequiredFieldsSchema);
    const violation = createConstraintViolation(context, undefined, undefined, {
      defaultMessage: "`${message.type}` has incompatible fields.",
    });

    expect(violation.typeName).toBe(RequiredFieldsSchema.typeName);
    expect(violation.fieldPath?.fieldName).toEqual([]);
    expect(violation.fieldValue).toBeUndefined();
    expect(violation.message).toEqual(
      expect.objectContaining({
        withPlaceholders: "`${message.type}` has incompatible fields.",
        placeholderValue: { "message.type": RequiredFieldsSchema.typeName },
      }),
    );
  });

  it("keeps field metadata placeholders when no concrete field value exists", () => {
    const context = createValidationContext(RequiredFieldsSchema).atField(
      RequiredFieldsSchema.field.name,
    );
    const violation = createConstraintViolation(
      context,
      RequiredFieldsSchema.field.name,
      undefined,
      {
        defaultMessage: "No value for `${field.path}`.",
      },
    );

    const listViolation = createConstraintViolation(
      createValidationContext(RequiredFieldsSchema).atField(RequiredFieldsSchema.field.tags),
      RequiredFieldsSchema.field.tags,
      undefined,
      {},
    );
    const mapViolation = createConstraintViolation(
      createValidationContext(RequiredFieldsSchema).atField(RequiredFieldsSchema.field.scores),
      RequiredFieldsSchema.field.scores,
      undefined,
      {},
    );

    expect(violation.fieldValue).toBeUndefined();
    expect(violation.message?.placeholderValue).toEqual({
      "message.type": RequiredFieldsSchema.typeName,
      "parent.type": RequiredFieldsSchema.typeName,
      "field.path": "name",
      "field.type": "string",
    });
    expect(listViolation.message?.placeholderValue["field.type"]).toBe("string");
    expect(mapViolation.message?.placeholderValue["field.type"]).toBe("int32");
    expect(violation.message?.placeholderValue).not.toHaveProperty("field.value");
  });
});
