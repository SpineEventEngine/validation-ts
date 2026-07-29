/** Console adapter for the inspectable runnable validation scenarios. */
import { Violations } from "@spine-event-engine/validation";
import { ExampleScenarios } from "./scenarios.js";

/** Describes the purpose of the `ConsoleOutput` member. */
const ConsoleOutput = {
  /** Prints each scenario violation in the same presentation used by the example.
   * @param violations Scenario violations to render, or an empty collection for a success message.
   */
  displayViolations(
    violations: ReturnType<typeof ExampleScenarios.run>[number]["violations"],
  ): void {
    if (violations.length === 0) {
      console.log("✓ No violations - message is valid!");
      return;
    }
    violations.forEach((violation, index) => {
      console.log(
        `${index + 1}. ${violation.typeName}.${Violations.failurePath(violation)}: ${Violations.formatMessage(violation)}`,
      );
    });
  },
};

console.log("=== Spine Validation Example ===\n");
for (const scenario of ExampleScenarios.run()) {
  console.log(scenario.name);
  console.log("-".repeat(scenario.name.length));
  console.log("Violations:", scenario.violationCount);
  ConsoleOutput.displayViolations(scenario.violations);
  console.log();
}
console.log("=== Example Complete ===");
