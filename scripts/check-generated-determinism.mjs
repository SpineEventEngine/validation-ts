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

const directGenerationCommands = {
  "package.json": {
    generate:
      "pnpm --filter @spine-event-engine/validation generate && pnpm --filter @spine-event-engine/validation generate:tests && pnpm --filter @spine-event-engine/example-smoke generate",
  },
  "packages/validation/package.json": {
    generate: "buf generate",
    "generate:tests": "cd tests && buf generate",
  },
  "packages/example/package.json": { generate: "buf generate" },
};

const generatorConfigurations = {
  "packages/validation/buf.gen.yaml":
    "version: v2\nplugins:\n  - local: protoc-gen-es\n    out: src/generated\n    opt:\n      - target=ts\n      - import_extension=js\n",
  "packages/validation/tests/buf.gen.yaml":
    "version: v2\nplugins:\n  - local: protoc-gen-es\n    out: generated\n    opt:\n      - target=ts\n      - import_extension=js\n",
  "packages/example/buf.gen.yaml":
    "version: v2\nplugins:\n  - local: protoc-gen-es\n    out: src/generated\n    opt:\n      - target=ts\n      - import_extension=js\n",
};

export function assertDirectGenerationCommands(manifests) {
  for (const [path, expectedScripts] of Object.entries(directGenerationCommands)) {
    const scripts = manifests[path]?.scripts;
    for (const [name, expected] of Object.entries(expectedScripts)) {
      if (scripts?.[name] !== expected) {
        throw new Error(`${path} ${name} must be exactly ${JSON.stringify(expected)}.`);
      }
      for (const lifecycleName of [`pre${name}`, `post${name}`]) {
        if (scripts?.[lifecycleName] !== undefined) {
          throw new Error(`${path} must not define lifecycle sibling ${lifecycleName}.`);
        }
      }
    }
  }
}

export function assertGeneratorConfiguration(path, source) {
  const expected = generatorConfigurations[path];
  if (source !== expected) {
    throw new Error(
      `${path} must use the direct ESM Buf generator configuration with import_extension=js.`,
    );
  }
}

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

async function assertDirectGenerationConfiguration() {
  const manifests = {};
  for (const path of Object.keys(directGenerationCommands)) {
    manifests[path] = JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"));
  }
  assertDirectGenerationCommands(manifests);

  for (const path of Object.keys(generatorConfigurations)) {
    assertGeneratorConfiguration(path, await readFile(resolve(repositoryRoot, path), "utf8"));
  }

  for (const root of generatedRoots) {
    for (const file of await listFiles(root)) {
      if (!file.endsWith(".ts")) continue;
      const contents = await readFile(file, "utf8");
      if (/from ["']\.\.?\/[^"']+(?<!\.js)["']/.test(contents)) {
        throw new Error(`Generated relative import is missing its .js extension: ${file}`);
      }
    }
  }
}

async function main() {
  const firstDigest = await treeDigest();
  await assertDirectGenerationConfiguration();
  for (const root of generatedRoots) {
    assertSafeGeneratedPath(root);
    await rm(root, { recursive: true, force: true });
  }

  const generation = spawnSync("pnpm", ["generate"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (generation.status !== 0) {
    process.exit(generation.status ?? 1);
  }

  const secondDigest = await treeDigest();
  await assertDirectGenerationConfiguration();
  if (firstDigest !== secondDigest) {
    console.error(
      `Generated output changed across identical runs: ${firstDigest} != ${secondDigest}`,
    );
    process.exit(1);
  }

  console.log(`Generated output is deterministic (${secondDigest}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
