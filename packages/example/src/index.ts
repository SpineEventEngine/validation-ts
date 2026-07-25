/** Console adapter for the inspectable runnable validation scenarios. */
import { Violations } from "@spine-event-engine/validation";
import { runExampleScenarios } from "./scenarios.js";

function displayViolations(
  violations: ReturnType<typeof runExampleScenarios>[number]["violations"],
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
}

console.log("=== Spine Validation Example ===\n");
for (const scenario of runExampleScenarios()) {
  console.log(scenario.name);
  console.log("-".repeat(scenario.name.length));
  console.log("Violations:", scenario.violationCount);
  displayViolations(scenario.violations);
  console.log();
}
console.log("=== Example Complete ===");
