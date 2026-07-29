import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
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
    "pnpm",
    [
      "--filter",
      "@spine-event-engine/validation",
      "pack",
      `--pack-destination=${temporaryRoot}`,
      "--json",
    ],
    repositoryRoot,
    true,
  );
  const parsedPackResult = JSON.parse(output);
  const packResult = Array.isArray(parsedPackResult) ? parsedPackResult[0] : parsedPackResult;
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
    (path) =>
      path.startsWith("src/") ||
      path.startsWith("tests/") ||
      path.startsWith("coverage/") ||
      path === "docs" ||
      path.startsWith("docs/"),
  );
  if (forbidden.length > 0) {
    throw new Error(`Packed package contains forbidden paths: ${forbidden.join(", ")}`);
  }

  const archives = (await readdir(temporaryRoot)).filter((name) => name.endsWith(".tgz"));
  if (archives.length !== 1) {
    throw new Error(`Expected one package archive, found ${archives.length}`);
  }

  const consumerRoot = join(temporaryRoot, "consumer");
  await mkdir(consumerRoot);
  await writeFile(join(temporaryRoot, "package.json"), JSON.stringify({ private: true }, null, 2));
  const archive = join(temporaryRoot, archives[0]);
  const protobufRuntime = resolve(
    repositoryRoot,
    "packages/validation/node_modules/@bufbuild/protobuf",
  );
  await writeFile(
    join(consumerRoot, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2),
  );
  run("pnpm", ["add", "--ignore-scripts", archive, protobufRuntime], consumerRoot);

  const typeSmokePath = join(consumerRoot, "smoke.ts");
  await writeFile(
    typeSmokePath,
    [
      'import type { DescMessage, Message } from "@bufbuild/protobuf";',
      'import * as validation from "@spine-event-engine/validation";',
      'import { ValidationConfigurationError, validate, Violations, type ConstraintViolation } from "@spine-event-engine/validation";',
      "",
      'type SmokeMessage = Message<"smoke.Message"> & { text: string };',
      "type SmokeSchema = DescMessage & { readonly $codegenv2: { a: SmokeMessage; b: unknown } };",
      "declare const schema: SmokeSchema;",
      "declare const message: SmokeMessage;",
      "declare const violation: ConstraintViolation;",
      "",
      "const violations = validate(schema, message);",
      "Violations.formatAll(violations);",
      "Violations.formatMessage(violation);",
      "Violations.failurePath(violation);",
      'const configurationError = new ValidationConfigurationError({ code: "INVALID_OPTION_VALUE", option: "range", typeName: "smoke.Message" });',
      "const configurationCode: string = configurationError.code;",
      "void configurationCode;",
      "",
      "// @ts-expect-error validate requires a message matching the schema.",
      'validate(schema, { $typeName: "smoke.Other" });',
      "// @ts-expect-error Removed collection formatter is not public.",
      "validation.formatViolations(violations);",
      "// @ts-expect-error Removed template formatter is not public.",
      "validation.formatTemplateString(violation.message);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(consumerRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          target: "ES2024",
        },
        files: ["smoke.ts"],
      },
      null,
      2,
    ),
  );
  run(resolve(repositoryRoot, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], consumerRoot);

  const smokePath = join(consumerRoot, "smoke.mjs");
  await writeFile(
    smokePath,
    [
      'import * as validation from "@spine-event-engine/validation";',
      'for (const name of ["validate", "ValidationConfigurationError"]) {',
      '    if (typeof validation[name] !== "function") {',
      "        throw new Error(`Expected callable runtime export: ${name}`);",
      "    }",
      "}",
      'if (typeof validation.Violations !== "object" || validation.Violations === null) {',
      '    throw new Error("Expected runtime export Violations to be an object");',
      "}",
      'for (const name of ["formatAll", "formatMessage", "failurePath"]) {',
      '    if (typeof validation.Violations[name] !== "function") {',
      "        throw new Error(`Expected Violations.${name} to be callable`);",
      "    }",
      "}",
      'for (const name of ["formatViolations", "formatTemplateString"]) {',
      "    if (name in validation) {",
      "        throw new Error(`Removed runtime export is present: ${name}`);",
      "    }",
      "}",
      'console.log("Consumer loaded the packed ESM API.");',
      "",
    ].join("\n"),
  );
  run(process.execPath, [smokePath], consumerRoot);
  console.log(`Packed ${paths.size} files and verified an installed consumer.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
