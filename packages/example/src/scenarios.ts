import { create } from "@bufbuild/protobuf";
import type { Message } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { anyPack } from "@bufbuild/protobuf/wkt";
import { validate, type ConstraintViolation } from "@spine-event-engine/validation";

import { ProductEnvelopeSchema, ProductSchema } from "./generated/product_pb.js";
import { Role, UserSchema } from "./generated/user_pb.js";

/** Inspectable result returned by each executable validation scenario. */
export interface ExampleScenarioResult {
  name: string;
  typeName: string;
  violationCount: number;
  fieldPaths: string[];
  violations: ConstraintViolation[];
}

/** Runs generated-schema scenarios used by the console adapter and tests. */
export function runExampleScenarios(): ExampleScenarioResult[] {
  return [
    result("missing user values", UserSchema, create(UserSchema, { id: 1, role: Role.USER })),
    result(
      "duplicate user tags",
      UserSchema,
      create(UserSchema, {
        id: 1,
        name: "Ada Lovelace",
        email: "ada@example.test",
        role: Role.USER,
        tags: ["typescript", "typescript"],
      }),
    ),
    result(
      "product at its exact minimum price",
      ProductSchema,
      create(ProductSchema, { id: "prod-1", name: "Keyboard", price: 0.01 }),
    ),
    result(
      "nested product category leaf violations",
      ProductSchema,
      create(ProductSchema, {
        id: "prod-2",
        name: "Keyboard",
        price: 1,
        category: { id: 0, name: "", context: "present" },
      }),
    ),
    result(
      "known Any payload leaf violations",
      ProductEnvelopeSchema,
      create(ProductEnvelopeSchema, {
        payload: anyPack(UserSchema, create(UserSchema, { id: 1, role: Role.USER })),
        knownPayloadType: create(UserSchema),
      }),
    ),
  ];
}

function result<T extends Message>(
  name: string,
  schema: GenMessage<T>,
  message: T,
): ExampleScenarioResult {
  const violations = validate(schema, message);
  return {
    name,
    typeName: schema.typeName,
    violationCount: violations.length,
    fieldPaths: violations.map((violation) => violation.fieldPath?.fieldName.join(".") ?? ""),
    violations,
  };
}
