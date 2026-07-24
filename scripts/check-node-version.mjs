const minimum = [24, 0, 0];
const current = process.versions.node.split(".").map(Number);

function isAtLeast(actual, expected) {
  return expected.every((part, index) => {
    const prefixMatches = expected
      .slice(0, index)
      .every((value, prefixIndex) => actual[prefixIndex] === value);
    return !prefixMatches || actual[index] >= part;
  });
}

if (!isAtLeast(current, minimum)) {
  console.error(`Node ${process.versions.node} is unsupported; use Node >=24.0.0.`);
  process.exit(1);
}

console.log(`Node ${process.versions.node} satisfies the >=24.0.0 requirement.`);
