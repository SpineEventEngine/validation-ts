import { createHash } from "node:crypto";
import { readdir, readFile, rm, lstat } from "node:fs/promises";
import { relative, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const generatedRoots = [
  "packages/validation/src/generated",
  "packages/validation/tests/generated",
  "packages/example/src/generated",
].map((path) => resolve(repositoryRoot, path));

function assertSafeGeneratedPath(path) {
  const relativePath = relative(repositoryRoot, path);
  if (
    relativePath.startsWith("..") ||
    !relativePath.startsWith("packages/") ||
    basename(path) !== "generated"
  ) {
    throw new Error(`Refusing to remove unsafe generated path: ${path}`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Generated output must not contain symlinks: ${path}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function treeDigest() {
  const digest = createHash("sha256");
  for (const root of generatedRoots) {
    const metadata = await lstat(root);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Expected a generated directory: ${root}`);
    }
    const files = (await listFiles(root)).sort();
    if (files.length === 0) {
      throw new Error(`Generated directory is empty: ${root}`);
    }
    for (const file of files) {
      digest.update(relative(repositoryRoot, file));
      digest.update(await readFile(file));
    }
  }
  return digest.digest("hex");
}

const firstDigest = await treeDigest();
for (const root of generatedRoots) {
  assertSafeGeneratedPath(root);
  await rm(root, { recursive: true, force: true });
}

const generation = spawnSync("npm", ["run", "generate"], {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: "inherit",
});
if (generation.status !== 0) {
  process.exit(generation.status ?? 1);
}

const secondDigest = await treeDigest();
if (firstDigest !== secondDigest) {
  console.error(
    `Generated output changed across identical runs: ${firstDigest} != ${secondDigest}`,
  );
  process.exit(1);
}

console.log(`Generated output is deterministic (${secondDigest}).`);
