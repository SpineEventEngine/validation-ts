import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = resolve(repositoryRoot, "build-protocol/proto/UPSTREAM_SOURCES.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

for (const source of manifest.frozenFiles) {
  const absolutePath = resolve(repositoryRoot, source.localPath);
  if (!absolutePath.startsWith(`${repositoryRoot}/`)) {
    failures.push(`${source.localPath}: path escapes the repository`);
    continue;
  }

  try {
    const metadata = await lstat(absolutePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      failures.push(`${source.localPath}: expected a regular, non-symlink file`);
      continue;
    }
    const content = await readFile(absolutePath);
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== source.sha256) {
      failures.push(`${source.localPath}: expected ${source.sha256}, found ${actual}`);
    }
  } catch (error) {
    failures.push(`${source.localPath}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("Immutable Proto verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Verified ${manifest.frozenFiles.length} immutable Proto files.`);
