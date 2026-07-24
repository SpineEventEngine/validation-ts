import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "validation-package-check-"));

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: join(temporaryRoot, "npm-cache"),
    },
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    if (capture) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
  return result.stdout ?? "";
}

try {
  const output = run(
    "npm",
    [
      "pack",
      "--workspace=@spine-event-engine/validation",
      `--pack-destination=${temporaryRoot}`,
      "--json",
    ],
    repositoryRoot,
    true,
  );
  const packResult = JSON.parse(output)[0];
  const paths = new Set(packResult.files.map((file) => file.path));
  const required = [
    "package.json",
    "README.md",
    "dist/index.js",
    "dist/index.d.ts",
    "proto/spine/options.proto",
  ];
  for (const path of required) {
    if (!paths.has(path)) {
      throw new Error(`Packed package is missing ${path}`);
    }
  }

  const forbidden = [...paths].filter(
    (path) => path.startsWith("src/") || path.startsWith("tests/") || path.startsWith("coverage/"),
  );
  if (forbidden.length > 0) {
    throw new Error(`Packed package contains forbidden paths: ${forbidden.join(", ")}`);
  }

  const archives = (await readdir(temporaryRoot)).filter((name) => name.endsWith(".tgz"));
  if (archives.length !== 1) {
    throw new Error(`Expected one package archive, found ${archives.length}`);
  }

  const consumerRoot = join(temporaryRoot, "consumer");
  await writeFile(join(temporaryRoot, "package.json"), JSON.stringify({ private: true }, null, 2));
  const archive = join(temporaryRoot, archives[0]);
  const protobufRuntime = resolve(repositoryRoot, "node_modules/@bufbuild/protobuf");
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `--prefix=${consumerRoot}`,
      archive,
      protobufRuntime,
    ],
    temporaryRoot,
  );

  const smokePath = join(consumerRoot, "smoke.cjs");
  await writeFile(
    smokePath,
    [
      'const validation = require("@spine-event-engine/validation");',
      'for (const name of ["validate", "formatViolations", "Violations"]) {',
      "    if (!(name in validation)) throw new Error(`Missing export: ${name}`);",
      "}",
      'console.log("Consumer loaded the packed CommonJS API.");',
      "",
    ].join("\n"),
  );
  run(process.execPath, [smokePath], consumerRoot);
  console.log(`Packed ${paths.size} files and verified an installed consumer.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
