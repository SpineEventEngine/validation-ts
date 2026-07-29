import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import test from "node:test";
import { parseDocument } from "yaml";

const pnpmActionSetup = "pnpm/action-setup";

function actionSetupReferences(source, workflow) {
  let parsed;
  try {
    const document = parseDocument(source);
    if (document.errors.length > 0)
      throw new Error(document.errors.map((error) => error.message).join("; "));
    parsed = document.toJS();
  } catch (error) {
    throw new Error(`Unable to parse workflow ${workflow}: ${error.message}`, { cause: error });
  }

  const references = [];
  const visited = new WeakSet();
  const walk = (value) => {
    if (value === null || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }

    for (const [key, entry] of Object.entries(value)) {
      if (key === "uses" && typeof entry === "string" && entry.startsWith(pnpmActionSetup))
        references.push(entry);
      walk(entry);
    }
  };
  walk(parsed);
  return references;
}

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
    for (const value of actionSetupReferences(source, workflow))
      references.push({ value, workflow });
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

test("rejects a bare pnpm action-setup reference alongside v6", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "steps:\n  - uses: pnpm/action-setup@v6\n  - uses: pnpm/action-setup\n",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in a literal run block", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "steps:\n  - uses: pnpm/action-setup@v6\n  - run: |2-\n      - uses: pnpm/action-setup@v4\n",
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-v6 flow-mapping action field after another key", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "steps:\n  - uses: pnpm/action-setup@v6\n  - { name: Activate pnpm, uses: pnpm/action-setup@v4, with: { version: 11.9.0 } }\n",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in comments", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "steps:\n  - uses: pnpm/action-setup@v6\n  # - uses: pnpm/action-setup@v4\n",
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in folded blocks, inline comments, and quoted scalars", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      'steps:\n  - uses: pnpm/action-setup@v6 # pnpm/action-setup@v4\n  - run: >-\n      pnpm/action-setup@v4\n  - name: "uses: pnpm/action-setup@v4"\n',
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects non-v6 uses fields in multiline and quoted-key mappings", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      'steps:\n  - uses: pnpm/action-setup@v6\n  - {\n      name: Activate pnpm,\n      uses: pnpm/action-setup@v4\n    }\n  - "uses": pnpm/action-setup@v4\n',
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-v6 uses field with a quoted key", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      'steps:\n  - uses: pnpm/action-setup@v6\n  - "uses": pnpm/action-setup@v4\n',
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects non-v6 uses fields in deeply nested flow mappings", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "steps:\n  - uses: pnpm/action-setup@v6\nworkflow_metadata: { nested: { action: { uses: pnpm/action-setup@v4 } } }\n",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports the workflow path when YAML parsing fails", () => {
  const root = createFixture();
  try {
    writeWorkflow(root, "verify.yml", "steps:\n  - uses: pnpm/action-setup@v6\n  - [\n");
    assert.throws(
      () => assertPnpmActionSetupV6({ root }),
      /Unable to parse workflow .*verify\.yml/i,
    );
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
