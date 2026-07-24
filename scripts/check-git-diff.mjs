import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function git(args, allowNoMatches = false) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.status !== 0 && !(allowNoMatches && result.status === 1)) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  return result.stdout ?? "";
}

git(["diff", "--check"]);

const legacyNames = git(
  [
    "grep",
    "-n",
    "-E",
    "@spine-event-engine/validation-ts|spine-validation-ts|validation-ts-workspace|2\\.0\\.0-snapshot\\.4",
    "--",
    ".",
    ":(exclude)scripts/check-git-diff.mjs",
    ":(exclude)build-protocol/work-logs/**",
  ],
  true,
);
if (legacyNames.trim().length > 0) {
  console.error("Legacy package names or versions remain:");
  console.error(legacyNames);
  process.exit(1);
}

console.log("Git whitespace and legacy-name checks passed.");
