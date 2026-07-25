import { runExampleScenarios } from "../src/scenarios.js";

describe("runnable validation scenarios", () => {
  it("uses real generated User and Product schemas to expose current validation behavior", () => {
    const scenarios = runExampleScenarios();

    expect(scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "missing user values",
          typeName: "example.User",
          fieldPaths: ["name", "email"],
        }),
        expect.objectContaining({
          name: "duplicate user tags",
          typeName: "example.User",
          fieldPaths: ["tags"],
          violationCount: 1,
        }),
        expect.objectContaining({
          name: "product at its exact minimum price",
          typeName: "example.Product",
          violationCount: 0,
        }),
        expect.objectContaining({
          name: "nested product category leaf violations",
          typeName: "example.Product",
          fieldPaths: ["category.id", "category.name"],
        }),
        expect.objectContaining({
          name: "known Any payload leaf violations",
          typeName: "example.ProductEnvelope",
          fieldPaths: ["payload.name", "payload.email"],
        }),
      ]),
    );
  });
});
