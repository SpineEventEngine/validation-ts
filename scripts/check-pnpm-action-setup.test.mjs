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
  const jobs = parsed?.jobs;
  if (jobs === null || typeof jobs !== "object" || Array.isArray(jobs)) return references;

  for (const job of Object.values(jobs)) {
    if (job === null || typeof job !== "object" || Array.isArray(job)) continue;
    if (typeof job.uses === "string" && job.uses.startsWith(pnpmActionSetup))
      references.push(job.uses);
    if (!Array.isArray(job.steps)) continue;
    for (const step of job.steps) {
      if (
        step !== null &&
        typeof step === "object" &&
        !Array.isArray(step) &&
        typeof step.uses === "string" &&
        step.uses.startsWith(pnpmActionSetup)
      )
        references.push(step.uses);
    }
  }
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

function writeStepsWorkflow(root, filename, steps) {
  const indentedSteps = steps
    .split("\n")
    .map((line) => (line.length === 0 ? line : `      ${line}`))
    .join("\n");
  writeWorkflow(
    root,
    filename,
    `name: Fixture\non: push\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n${indentedSteps}\n`,
  );
}

test("accepts quoted and unquoted v6 references in yml and yaml workflows", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(root, "verify.yml", "- uses: pnpm/action-setup@v6");
    writeStepsWorkflow(root, "publish.yaml", "- uses: 'pnpm/action-setup@v6'");
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects every pnpm action-setup reference other than v6", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(root, "verify.yml", '- uses: "pnpm/action-setup@v4"');
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a bare pnpm action-setup reference alongside v6", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      "- uses: pnpm/action-setup@v6\n- uses: pnpm/action-setup",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in a literal run block", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      "- uses: pnpm/action-setup@v6\n- run: |2-\n    - uses: pnpm/action-setup@v4",
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-v6 flow-mapping action field after another key", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      "- uses: pnpm/action-setup@v6\n- { name: Activate pnpm, uses: pnpm/action-setup@v4, with: { version: 11.9.0 } }",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in comments", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      "- uses: pnpm/action-setup@v6\n# - uses: pnpm/action-setup@v4",
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores pnpm action-setup text in folded blocks, inline comments, and quoted scalars", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      '- uses: pnpm/action-setup@v6 # pnpm/action-setup@v4\n- run: >-\n    pnpm/action-setup@v4\n- name: "uses: pnpm/action-setup@v4"',
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects non-v6 uses fields in multiline and quoted-key mappings", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      '- uses: pnpm/action-setup@v6\n- {\n    name: Activate pnpm,\n    uses: pnpm/action-setup@v4\n  }\n- "uses": pnpm/action-setup@v4',
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-v6 uses field with a quoted key", () => {
  const root = createFixture();
  try {
    writeStepsWorkflow(
      root,
      "verify.yml",
      '- uses: pnpm/action-setup@v6\n- "uses": pnpm/action-setup@v4',
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects non-v6 uses fields in nested flow-style jobs", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "name: Fixture\non: push\njobs: { verify: { runs-on: ubuntu-latest, steps: [ { uses: pnpm/action-setup@v6 }, { uses: pnpm/action-setup@v4 } ] } }\n",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-v6 reusable-workflow job uses field", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "reusable.yml",
      "name: Fixture\non: push\njobs:\n  reusable:\n    uses: pnpm/action-setup@v4\n",
    );
    assert.throws(() => assertPnpmActionSetupV6({ root }), /pnpm\/action-setup@v6/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores env uses values outside GitHub Actions action locations", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "name: Fixture\non: push\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    env:\n      uses: pnpm/action-setup@v4\n    steps:\n      - uses: pnpm/action-setup@v6\n",
    );
    assert.doesNotThrow(() => assertPnpmActionSetupV6({ root }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports the workflow path when YAML parsing fails", () => {
  const root = createFixture();
  try {
    writeWorkflow(
      root,
      "verify.yml",
      "name: Fixture\non: push\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: pnpm/action-setup@v6\n      - [\n",
    );
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
    writeStepsWorkflow(root, "verify.yaml", "- uses: actions/checkout@v6");
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
