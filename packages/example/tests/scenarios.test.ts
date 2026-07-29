import { create } from "@bufbuild/protobuf";
import { anyUnpack, StringValueSchema } from "@bufbuild/protobuf/wkt";
import { ValidationConfigurationError, Violations, validate } from "@spine-event-engine/validation";

import { ExampleScenarios } from "../src/scenarios.js";
import { InvalidRequiredTargetSchema } from "../src/generated/testing/invalid_configuration_pb.js";

function scenario(name: string) {
  const value = ExampleScenarios.run().find((item) => item.name === name);
  if (!value) throw new Error(`Missing example scenario: ${name}`);
  return value;
}

describe("runnable validation scenarios", () => {
  it("reports missing User values with an exact root, paths, and diagnostics", () => {
    const value = scenario("missing user values");
    expect(value.typeName).toBe("example.User");
    expect(value.fieldPaths).toEqual(["name", "email"]);
    expect(value.violations.map(Violations.formatMessage)).toEqual([
      "The field `example.User.name` of the type `string` must have a non-default value.",
      "The field `example.User.email` of the type `string` must have a non-default value.",
    ]);
  });

  it("reports one duplicate equality class with its packed representative and diagnostics", () => {
    const value = scenario("duplicate user tags");
    expect(value.violations).toHaveLength(1);
    const [violation] = value.violations;
    expect(violation.typeName).toBe("example.User");
    expect(violation.fieldPath?.fieldName).toEqual(["tags"]);
    expect(anyUnpack(violation.fieldValue!, StringValueSchema)).toMatchObject({
      value: "typescript",
    });
    expect(violation.message?.placeholderValue).toMatchObject({
      "field.value": "[typescript, typescript]",
      "field.duplicates": "[typescript]",
    });
    expect(Violations.formatMessage(violation)).toBe(
      "Tags must be unique; duplicates: `[typescript]`.",
    );
  });

  it("formats the invalid User pattern with its exact root and field path", () => {
    const value = scenario("invalid user email pattern");
    expect(value.typeName).toBe("example.User");
    expect(value.fieldPaths).toEqual(["email"]);
    expect(value.violations.map(Violations.formatMessage)).toEqual(["Email must be valid."]);
  });

  it("accepts the Product exact minimum price", () => {
    expect(scenario("product at its exact minimum price").violations).toEqual([]);
  });

  it("shows accepted and rejected deterministic time scenarios", () => {
    expect(scenario("past and future time constraints").violations).toEqual([]);
    const rejected = scenario("violated past and future time constraints");
    expect(rejected.fieldPaths).toEqual(["issued_at", "expires_at"]);
    expect(rejected.violations.map(Violations.formatMessage)).toEqual([
      expect.stringContaining("past"),
      expect.stringContaining("future"),
    ]);
  });

  it("keeps nested Category reports leaf-only under the Product root", () => {
    const value = scenario("nested product category leaf violations");
    expect(value.typeName).toBe("example.Product");
    expect(value.fieldPaths).toEqual(["category.id", "category.name"]);
    expect(value.fieldPaths).not.toContain("category");
  });

  it("keeps known Any payload reports as prefixed leaves under the envelope root", () => {
    const value = scenario("known Any payload leaf violations");
    expect(value.typeName).toBe("example.ProductEnvelope");
    expect(value.fieldPaths).toEqual(["payload.name", "payload.email"]);
  });

  it("exposes the public configuration-error shape for a test-only invalid target", () => {
    try {
      validate(InvalidRequiredTargetSchema, create(InvalidRequiredTargetSchema));
      throw new Error("Expected configuration error");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationConfigurationError);
      expect(error).toMatchObject({
        code: "UNSUPPORTED_OPTION_TARGET",
        option: "required",
        typeName: "example.testing.InvalidRequiredTarget",
        fieldPath: ["quantity"],
      });
    }
  });
});
