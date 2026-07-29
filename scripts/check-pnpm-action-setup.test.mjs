import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import test from "node:test";

const pnpmActionSetup = "pnpm/action-setup";

function withoutYamlComment(line) {
  let quote;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "#") {
      return line.slice(0, index);
    }
  }
  return line;
}

function indentation(line) {
  return line.match(/^[ \t]*/)[0].length;
}

function isBlockScalarHeader(line) {
  return /^[ \t]*(?:-\s+)?[^#:\s][^:]*:\s*[>|][+-]?\d?[+-]?\s*$/.test(line);
}

function yamlScalarValue(value) {
  const match = value.match(/^\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))\s*$/);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function flowDepthBefore(source, end) {
  let depth = 0;
  let quote;
  for (let index = 0; index < end; index++) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
    }
  }
  return depth;
}

function usesValuesInFlowMapping(source) {
  const references = [];
  const flowUses = /([,{])\s*uses\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,\s}]+))/g;
  for (const match of source.matchAll(flowUses)) {
    const depth = flowDepthBefore(source, match.index);
    const delimiter = match[1];
    if ((delimiter === "{" && depth === 0) || (delimiter === "," && depth === 1))
      references.push(match[2] ?? match[3] ?? match[4]);
  }
  return references;
}

function actionSetupReferences(source) {
  const references = [];
  let blockScalarIndent;
  for (const rawLine of source.split(/\r?\n/)) {
    if (blockScalarIndent !== undefined) {
      if (rawLine.trim().length === 0) continue;
      if (indentation(rawLine) > blockScalarIndent) continue;
      blockScalarIndent = undefined;
    }

    const line = withoutYamlComment(rawLine);
    if (isBlockScalarHeader(line)) {
      blockScalarIndent = indentation(rawLine);
      continue;
    }

    const blockUses = line.match(/^\s*(?:-\s*)?uses\s*:\s*(.+)$/);
    const blockValue = blockUses && yamlScalarValue(blockUses[1]);
    if (blockValue) references.push(blockValue);
    references.push(...usesValuesInFlowMapping(line));
  }
  return references.filter((value) => value.startsWith(pnpmActionSetup));
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
    for (const value of actionSetupReferences(source)) references.push({ value, workflow });
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
