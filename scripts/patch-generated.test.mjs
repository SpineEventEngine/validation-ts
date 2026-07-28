import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const patcher = resolve("packages/validation/scripts/patch-generated.mjs");
const declaration = "export const require: GenExtension<MessageOptions, RequireOption>";

function fixture(source = declaration) {
  const root = mkdtempSync(join(tmpdir(), "validation-patcher-"));
  const spine = join(root, "spine");
  mkdirSync(spine);
  writeFileSync(join(spine, "options_pb.ts"), `${source}\nimport { value } from "./other_pb";\n`);
  return root;
}

function run(root) {
  return execFileSync(process.execPath, [patcher, "source"], {
    env: { ...process.env, VALIDATION_GENERATED_SOURCE_ROOT: root },
    encoding: "utf8",
    stdio: "pipe",
  });
}

test("fails when the explicitly selected generated target is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "validation-patcher-missing-"));
  try {
    assert.throws(() => run(root), /Expected generated target was not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when the expected generated declaration changes", () => {
  const root = fixture("export const renamed: GenExtension<MessageOptions, RequireOption>");
  try {
    assert.throws(() => run(root), /Expected generated declaration was not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renames the declaration and rewrites imports idempotently", () => {
  const root = fixture();
  try {
    run(root);
    const path = join(root, "spine", "options_pb.ts");
    const once = readFileSync(path, "utf8");
    run(root);
    assert.equal(readFileSync(path, "utf8"), once);
    assert.match(once, /requireFields/);
    assert.match(once, /\.\/other_pb\.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
