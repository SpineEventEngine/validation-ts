import { create } from "@bufbuild/protobuf";
import type { Message } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { anyPack } from "@bufbuild/protobuf/wkt";
import { validate, type ConstraintViolation } from "@spine-event-engine/validation";

import { ProductEnvelopeSchema, ProductSchema } from "./generated/product_pb.js";
import { Role, UserSchema } from "./generated/user_pb.js";

/** Captures the input identity and validation outcome of one runnable example scenario. */
export interface ExampleScenarioResult {
  /** Identifies the scenario for console output and test assertions. */
  name: string;
  /** Names the Protobuf message type used by the scenario. */
  typeName: string;
  /** Counts violations returned while validating the scenario message. */
  violationCount: number;
  /** Lists dot-separated paths for violations that identify a field. */
  fieldPaths: string[];
  /** Contains the complete validation violations for the scenario message. */
  violations: ConstraintViolation[];
}

/** Runs generated-schema scenarios used by the console adapter and tests. */
export const ExampleScenarios = {
  /** Produces the fixed set of executable validation scenarios.
   * @returns Results for every example scenario in display order.
   */
  run(): ExampleScenarioResult[] {
    return [
      ExampleScenarios.result(
        "missing user values",
        UserSchema,
        create(UserSchema, { id: 1, role: Role.USER }),
      ),
      ExampleScenarios.result(
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
      ExampleScenarios.result(
        "invalid user email pattern",
        UserSchema,
        create(UserSchema, {
          id: 1,
          name: "Ada Lovelace",
          email: "not-an-email",
          role: Role.USER,
        }),
      ),
      ExampleScenarios.result(
        "past and future time constraints",
        UserSchema,
        create(UserSchema, {
          id: 1,
          name: "Ada Lovelace",
          email: "ada@example.test",
          role: Role.USER,
          issuedAt: { seconds: 0n },
          expiresAt: { seconds: 4_102_444_800n },
        }),
      ),
      ExampleScenarios.result(
        "violated past and future time constraints",
        UserSchema,
        create(UserSchema, {
          id: 1,
          name: "Ada Lovelace",
          email: "ada@example.test",
          role: Role.USER,
          issuedAt: { seconds: 4_102_444_800n },
          expiresAt: { seconds: 1n },
        }),
      ),
      ExampleScenarios.result(
        "product at its exact minimum price",
        ProductSchema,
        create(ProductSchema, { id: "prod-1", name: "Keyboard", price: 0.01 }),
      ),
      ExampleScenarios.result(
        "nested product category leaf violations",
        ProductSchema,
        create(ProductSchema, {
          id: "prod-2",
          name: "Keyboard",
          price: 1,
          category: { id: 0, name: "", context: "present" },
        }),
      ),
      ExampleScenarios.result(
        "known Any payload leaf violations",
        ProductEnvelopeSchema,
        create(ProductEnvelopeSchema, {
          payload: anyPack(UserSchema, create(UserSchema, { id: 1, role: Role.USER })),
        }),
      ),
    ];
  },

  /** Validates one scenario message and records presentation-ready details.
   * @param name Display name for the scenario.
   * @param schema Generated descriptor used to validate the message.
   * @param message Message instance supplied to validation.
   * @returns Scenario identity, violations, and derived display fields.
   */
  result<T extends Message>(
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
  },
};
