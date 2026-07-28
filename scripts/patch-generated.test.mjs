import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const validationPatcher = resolve("packages/validation/scripts/patch-generated.mjs");
const examplePatcher = resolve("packages/example/scripts/patch-generated.mjs");
const declaration = "export const require: GenExtension<MessageOptions, RequireOption>";

function fixture(source = declaration) {
  const root = mkdtempSync(join(tmpdir(), "validation-patcher-"));
  const spine = join(root, "spine");
  mkdirSync(spine);
  writeFileSync(join(spine, "options_pb.ts"), `${source}\nimport { value } from "./other_pb";\n`);
  return root;
}

function run(patcher, root, env) {
  return execFileSync(process.execPath, [patcher, "source"], {
    env: { ...process.env, [env]: root },
    encoding: "utf8",
    stdio: "pipe",
  });
}

test("fails when the explicitly selected generated target is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "validation-patcher-missing-"));
  try {
    assert.throws(
      () => run(validationPatcher, root, "VALIDATION_GENERATED_SOURCE_ROOT"),
      /Expected generated target was not found/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when the expected generated declaration changes", () => {
  const root = fixture("export const renamed: GenExtension<MessageOptions, RequireOption>");
  try {
    assert.throws(
      () => run(validationPatcher, root, "VALIDATION_GENERATED_SOURCE_ROOT"),
      /Expected generated declaration was not found/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renames the declaration and rewrites imports idempotently", () => {
  const root = fixture();
  try {
    run(validationPatcher, root, "VALIDATION_GENERATED_SOURCE_ROOT");
    const path = join(root, "spine", "options_pb.ts");
    const once = readFileSync(path, "utf8");
    run(validationPatcher, root, "VALIDATION_GENERATED_SOURCE_ROOT");
    assert.equal(readFileSync(path, "utf8"), once);
    assert.match(once, /requireFields/);
    assert.match(once, /\.\/other_pb\.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("example patcher fails loudly and rewrites imports idempotently", () => {
  const missing = mkdtempSync(join(tmpdir(), "example-patcher-missing-"));
  const changed = fixture("export const renamed: GenExtension<MessageOptions, RequireOption>");
  const valid = fixture();
  try {
    assert.throws(
      () => run(examplePatcher, missing, "EXAMPLE_GENERATED_ROOT"),
      /Expected generated target was not found/,
    );
    assert.throws(
      () => run(examplePatcher, changed, "EXAMPLE_GENERATED_ROOT"),
      /Expected generated declaration was not found/,
    );
    run(examplePatcher, valid, "EXAMPLE_GENERATED_ROOT");
    const path = join(valid, "spine", "options_pb.ts");
    const once = readFileSync(path, "utf8");
    run(examplePatcher, valid, "EXAMPLE_GENERATED_ROOT");
    assert.equal(readFileSync(path, "utf8"), once);
    assert.match(once, /requireFields/);
    assert.match(once, /\.\/other_pb\.js/);
  } finally {
    for (const root of [missing, changed, valid]) rmSync(root, { recursive: true, force: true });
  }
});
