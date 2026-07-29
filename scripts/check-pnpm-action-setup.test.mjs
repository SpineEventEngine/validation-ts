import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import test from "node:test";

const pnpmActionSetup = "pnpm/action-setup";
const uses = /^\s*(?:-\s*)?uses:\s*(?:["']([^"']+)["']|([^\s#]+))/gm;

function findWorkflowFiles(root) {
  const workflows = join(root, ".github", "workflows");
  if (!readdirSync(workflows, { withFileTypes: true }).some((entry) => entry.isFile()))
    throw new Error(`No workflow files found in ${workflows}`);

  const files = readdirSync(workflows, { withFileTypes: true })
    .filter((entry) => entry.isFile() && [".yml", ".yaml"].includes(extname(entry.name)))
    .map((entry) => join(workflows, entry.name));
  if (files.length === 0) throw new Error(`No workflow files found in ${workflows}`);
  return files;
}

function assertPnpmActionSetupV6({ root }) {
  const references = [];
  for (const workflow of findWorkflowFiles(root)) {
    const source = readFileSync(workflow, "utf8");
    uses.lastIndex = 0;
    for (const match of source.matchAll(uses)) {
      const value = match[1] ?? match[2];
      if (value.startsWith(`${pnpmActionSetup}@`)) references.push({ value, workflow });
    }
  }

  if (references.length === 0) throw new Error("No pnpm/action-setup references found");
  for (const reference of references) {
    assert.equal(
      reference.value,
      "pnpm/action-setup@v6",
      `${reference.workflow} must use pnpm/action-setup@v6`,
    );
  }
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "validation-pnpm-action-setup-"));
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  return root;
}

function writeWorkflow(root, filename, source) {
  writeFileSync(join(root, ".github", "workflows", filename), source);
}

test("accepts quoted and unquoted v6 references in yml and yaml workflows", () => {
  const root = createFixture();
  try {
    writeWorkflow(root, "verify.yml", "steps:\n  - uses: pnpm/action-setup@v6\n");
    writeWorkflow(root, "publish.yaml", "steps:\n  - uses: 'pnpm/action-setup@v6'\n");
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects every pnpm action-setup reference other than v6", () => {
  const root = createFixture();
  try {
    writeWorkflow(root, "verify.yml", 'steps:\n  - uses: "pnpm/action-setup@v4"\n');
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when no workflow files exist", () => {
  const root = createFixture();
  try {
    assert.throws(() => assertPnpmActionSetupV6({ root }), /No workflow files found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when workflows omit pnpm action-setup", () => {
  const root = createFixture();
  try {
    writeWorkflow(root, "verify.yaml", "steps:\n  - uses: actions/checkout@v6\n");
    assert.throws(
      () => assertPnpmActionSetupV6({ root }),
      /No pnpm\/action-setup references found/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the repository workflows use pnpm action-setup v6", () => {
  assertPnpmActionSetupV6({ root: resolve(import.meta.dirname, "..") });
});
